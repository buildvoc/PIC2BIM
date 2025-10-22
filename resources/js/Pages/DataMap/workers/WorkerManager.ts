/**
 * Worker Manager for handling multiple Web Workers
 * Manages a pool of workers for parallel data processing
 */

type WorkerTask = {
  requestId: string;
  dataType: string;
  data: any;
  resolve: (data: any) => void;
  reject: (error: Error) => void;
};

class WorkerManager {
  private workers: Worker[] = [];
  private workerCount: number;
  private taskQueue: WorkerTask[] = [];
  private activeTasks: Map<string, WorkerTask> = new Map();
  private nextWorkerId = 0;
  private workerUrls: string[] = []; // Track blob URLs for cleanup

  constructor(workerCount: number = navigator.hardwareConcurrency || 4) {
    this.workerCount = Math.min(workerCount, 8); // Max 8 workers
    this.initializeWorkers();
  }

  private initializeWorkers() {
    for (let i = 0; i < this.workerCount; i++) {
      try {
        // Create worker using blob URL to avoid CORS issues
        const worker = this.createWorkerFromBlob();
        
        worker.onmessage = (event) => this.handleWorkerMessage(event);
        worker.onerror = (error) => this.handleWorkerError(error);
        
        this.workers.push(worker);
      } catch (error) {
        console.error('Failed to create worker:', error);
      }
    }

    if (this.workers.length === 0) {
      console.warn('No workers created, falling back to main thread processing');
    }
  }

  /**
   * Create worker from blob URL to avoid CORS issues
   */
  private createWorkerFromBlob(): Worker {
    // Inline worker code to avoid CORS
    const workerCode = `
      // Process GeoJSON FeatureCollection
      const processFeatureCollection = (data) => {
        // Data can be passed directly or wrapped in { data: ... }
        const featureData = data?.data || data;
        
        // Return empty FeatureCollection if no data
        if (!featureData) {
          return { type: 'FeatureCollection', features: [] };
        }
        
        if (featureData.type === 'FeatureCollection' && Array.isArray(featureData.features)) {
          return {
            type: 'FeatureCollection',
            features: featureData.features.map((feature) => ({
              type: 'Feature',
              geometry: feature.geometry,
              properties: feature.properties || {}
            }))
          };
        }
        
        return featureData;
      };

      // Process array of objects (like NHLE)
      const processArrayData = (data) => {
        // NHLE data comes as array directly, not wrapped in data property
        const arrayData = Array.isArray(data) ? data : (data?.data || []);
        
        if (!Array.isArray(arrayData)) return [];
        
        return arrayData.map((item) => ({
          ...item,
          // Parse geom if it's a string
          geom: typeof item.geom === 'string' ? JSON.parse(item.geom) : item.geom
        }));
      };

      // Process photos data (comes as FeatureCollection from DataMapPhotoCollection)
      const processPhotosData = (data) => {
        // Data can be passed directly or wrapped
        const photoData = data?.data || data;
        
        if (!photoData) return { type: 'FeatureCollection', features: [] };
        
        // If already a FeatureCollection, return as-is
        if (photoData.type === 'FeatureCollection') {
          return photoData;
        }
        
        // Fallback: convert array to FeatureCollection
        const features = Array.isArray(photoData) ? photoData : [];
        return {
          type: 'FeatureCollection',
          features: features.map((photo) => ({
            ...photo,
            geometry: typeof photo.geometry === 'string' ? JSON.parse(photo.geometry) : photo.geometry
          }))
        };
      };

      // Main processor function
      const processData = (dataType, data) => {
        try {
          switch (dataType) {
            case 'buildingParts':
            case 'sites':
            case 'uprn':
            case 'osmBuildingParts':
            case 'osmAddresses':
            case 'osmLanduseAreas':
            case 'epcCertificates':
              return processFeatureCollection(data);
            
            case 'nhle':
              return processArrayData(data);
            
            case 'landRegistryInspire':
              // Data can be passed directly or wrapped
              const lrData = data?.data || data;
              if (lrData?.features) {
                return {
                  type: 'FeatureCollection',
                  features: lrData.features
                };
              }
              return lrData || data;
            
            case 'photos':
              return processPhotosData(data);
            
            default:
              console.warn('Unknown data type: ' + dataType + ', returning raw data');
              return data;
          }
        } catch (error) {
          console.error('Error processing ' + dataType + ':', error);
          throw error;
        }
      };

      // Worker message handler
      self.onmessage = (event) => {
        const { type, dataType, data, requestId } = event.data;
        
        if (type !== 'process') {
          return;
        }
        
        try {
          const processedData = processData(dataType, data);
          
          self.postMessage({
            type: 'result',
            dataType: dataType,
            data: processedData,
            requestId: requestId
          });
        } catch (error) {
          self.postMessage({
            type: 'error',
            dataType: dataType,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId: requestId
          });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    // Track URL for cleanup
    this.workerUrls.push(workerUrl);
    
    return new Worker(workerUrl);
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { type, dataType, data, error, requestId } = event.data;
    
    const task = this.activeTasks.get(requestId);
    if (!task) {
      console.warn(`Received response for unknown request: ${requestId}`);
      return;
    }

    this.activeTasks.delete(requestId);

    if (type === 'result') {
      task.resolve(data);
    } else if (type === 'error') {
      task.reject(new Error(error || 'Worker processing failed'));
    }

    // Process next task in queue
    this.processNextTask();
  }

  private handleWorkerError(error: ErrorEvent) {
    console.error('Worker error:', error);
    
    // Find and reject all active tasks
    this.activeTasks.forEach((task) => {
      task.reject(new Error('Worker crashed'));
    });
    
    this.activeTasks.clear();
  }

  private processNextTask() {
    if (this.taskQueue.length === 0) {
      return;
    }

    const task = this.taskQueue.shift();
    if (!task) return;

    this.executeTask(task);
  }

  private executeTask(task: WorkerTask) {
    if (this.workers.length === 0) {
      // Fallback to main thread
      this.processFallback(task);
      return;
    }

    // Round-robin worker selection
    const worker = this.workers[this.nextWorkerId % this.workers.length];
    this.nextWorkerId++;

    this.activeTasks.set(task.requestId, task);

    worker.postMessage({
      type: 'process',
      dataType: task.dataType,
      data: task.data,
      requestId: task.requestId
    });
  }

  private processFallback(task: WorkerTask) {
    // Simple fallback processing on main thread
    try {
      // Just return the data as-is for fallback
      const result = task.data?.data || task.data;
      task.resolve(result);
    } catch (error) {
      task.reject(error instanceof Error ? error : new Error('Fallback processing failed'));
    }
  }

  /**
   * Process data using worker pool
   */
  public async processData(dataType: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = `${dataType}_${Date.now()}_${Math.random()}`;
      
      const task: WorkerTask = {
        requestId,
        dataType,
        data,
        resolve,
        reject
      };

      // If workers are available and no queue, execute immediately
      if (this.activeTasks.size < this.workers.length) {
        this.executeTask(task);
      } else {
        // Otherwise, queue the task
        this.taskQueue.push(task);
      }
    });
  }

  /**
   * Process multiple data items in parallel
   */
  public async processMultiple(items: Array<{ dataType: string; data: any }>): Promise<any[]> {
    return Promise.all(
      items.map(item => this.processData(item.dataType, item.data))
    );
  }

  /**
   * Terminate all workers
   */
  public terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.activeTasks.clear();
    this.taskQueue = [];
    
    // Revoke blob URLs to free memory
    this.workerUrls.forEach(url => URL.revokeObjectURL(url));
    this.workerUrls = [];
  }

  /**
   * Get worker pool status
   */
  public getStatus() {
    return {
      workerCount: this.workers.length,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length
    };
  }
}

// Singleton instance
let workerManagerInstance: WorkerManager | null = null;

export const getWorkerManager = (): WorkerManager => {
  if (!workerManagerInstance) {
    workerManagerInstance = new WorkerManager();
  }
  return workerManagerInstance;
};

export const terminateWorkerManager = () => {
  if (workerManagerInstance) {
    workerManagerInstance.terminate();
    workerManagerInstance = null;
  }
};

export default WorkerManager;
