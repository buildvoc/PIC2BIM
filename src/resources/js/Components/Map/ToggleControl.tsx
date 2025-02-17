import { IControl, Map } from 'mapbox-gl';

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
        this._container.className = `mapboxgl-ctrl flex flex-row bg-[#f1f0f0]`;

        const mapViewButton = document.createElement('button');
        mapViewButton.textContent = 'Map';
        mapViewButton.className = 'p-2 border-none text-black cursor-pointer text-lg relative shadow';
        mapViewButton.onclick = () => {
            if (this._props.onMapViewClick) {
                this._props.onMapViewClick();
            }
        };
        this._container.appendChild(mapViewButton);

        const satelliteViewButton = document.createElement('button');
        satelliteViewButton.textContent = 'Satellite';
        satelliteViewButton.className = 'p-2 border-none text-black cursor-pointer text-lg relative shadow';
        satelliteViewButton.onclick = () => {
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
