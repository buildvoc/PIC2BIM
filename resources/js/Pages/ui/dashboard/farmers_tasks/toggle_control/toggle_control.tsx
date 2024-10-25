import { IControl, Map } from 'mapbox-gl';
import styles from './toggle_control.module.css';

interface ToggleControlProps {
    onMapViewClick?: () => void;
    onSatelliteViewClick?: () => void;
}

class ToggleControl implements IControl {
    private _map: Map | undefined;
    private _container: HTMLDivElement | undefined;
    private _props: ToggleControlProps;

    constructor(props: ToggleControlProps) {
        this._props = props;
    }

    onAdd(map: Map): HTMLDivElement {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = `mapboxgl-ctrl ${styles['mapboxgl-ctrl-group']}`;

        // Create Map View Button
        const mapViewButton = document.createElement('button');
        mapViewButton.textContent = 'Map';
        mapViewButton.className = styles['button'];
        mapViewButton.onclick = () => {
            // Call the callback if provided
            if (this._props.onMapViewClick) {
                this._props.onMapViewClick();
            }
        };
        this._container.appendChild(mapViewButton);

        // Create Satellite View Button
        const satelliteViewButton = document.createElement('button');
        satelliteViewButton.textContent = 'Satellite';
        satelliteViewButton.className = styles['button'];
        satelliteViewButton.onclick = () => {
            // Call the callback if provided
            if (this._props.onSatelliteViewClick) {
                this._props.onSatelliteViewClick();
            }
        };
        this._container.appendChild(satelliteViewButton);

        return this._container;
    }

    onRemove(): void {
        if (this._container?.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
        this._map = undefined;
    }
}

export default ToggleControl;
