import { memo, useEffect, useRef, useState } from 'react';
import mapboxgl, { GeoJSONSource, LngLat, LngLatBoundsLike } from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";
import { Link, router, usePage, useRemember } from '@inertiajs/react';
import { ChevronDownIcon } from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClose, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import {
  Dialog,
  DialogPanel,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel,
} from '@headlessui/react'
import ToggleControl from '@/Components/Map/ToggleControl';

import type { PageProps, PaginatedData, Photo } from '@/types';
import { createRoot } from 'react-dom/client';
import TaskPhoto from '@/Components/Map/TaskPhoto';

export function Index({ auth }: PageProps) {

  const { shapes: mShapes, selectedShape: mSelectedShape, photos, search } = usePage<{
    shapes: any;
    selectedShape?: any;
    photos: PaginatedData<Photo>;
    search?: string;
  }>().props;
  
  const [shapes, setShapes] = useRemember(mShapes, `shapes`);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>([]);
  const markerRefSymbols = useRef<any>([]);

  const [mapStyle, setMapStyle] = useState(
    "mapbox://styles/mapbox/streets-v11"
  );

  const mapViewClickHandler = () => {
    setMapStyle("mapbox://styles/mapbox/streets-v11");
  };

  const satelliteViewClickHandler = () => {
    setMapStyle("mapbox://styles/mapbox/satellite-v9");
  };

  const toggleControl = new ToggleControl({
    onMapViewClick: mapViewClickHandler,
    onSatelliteViewClick: satelliteViewClickHandler,
  });

  useEffect(() => {
    loadMapBox();
    return () => {
      mapRef.current?.remove();
    };
  }, [mapStyle]);

  const loadMapBox = () => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: mapStyle,
      center: [0.1, 52.5],
      zoom: 6,
      maxBounds: [
        [-180, -85],
        [180, 85],
      ],
    });
    mapRef.current.addControl(toggleControl, "top-left");
    mapRef.current.addControl(new mapboxgl.NavigationControl());
  };

  useEffect(() => {
    if (mapRef.current) {
      showPolygons();
    }
  }, []);

  const showPolygons = async () => {
    //console.log(shapes.data);
    
    mapRef.current?.on("load", () => {
      mapRef.current?.addSource('shapes-data', {
        type: 'geojson',
        data: shapes.data
      });
      mapRef.current?.addLayer({
        'id': 'shapes-layer',
        'type': 'fill',
        'source': 'shapes-data',
        'layout': {},
        'paint': {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.2
        }
      });
      mapRef.current?.addLayer({
        'id': 'shapes-layer-highlighted',
        'type': 'fill',
        'source': 'shapes-data',
        'layout': {},
        'paint': {
            'fill-outline-color': '#FFF',
            'fill-color': '#00008B',
            'fill-opacity': 0.85
        },
        filter: ['in', 'ogc_fid', '']
      });

      mapRef.current?.on('click', 'shapes-layer', (e) => {
        const bbx: [mapboxgl.PointLike, mapboxgl.PointLike] = [
          [e.point.x, e.point.y],
          [e.point.x, e.point.y]
        ];
        const selectedFeatures = mapRef.current?.queryRenderedFeatures(bbx, {
          layers: ['shapes-layer']
        });
        const ogc_fid = selectedFeatures?.map((feature) => feature?.properties?.ogc_fid);
        if (ogc_fid && Array.isArray(ogc_fid)) {
          mapRef.current?.setFilter('shapes-layer-highlighted', [
            'in',
            'ogc_fid',
            ...ogc_fid
          ]);
        }

        mapRef.current?.jumpTo({
          center: e.lngLat,
          zoom: 10,
        });
        
        applyFilters({ogc_fid: ogc_fid && ogc_fid[0]});
      });

      photos && photos.data && photos.data.forEach((photo: Photo) => {
        addMarkerSymbols(photo);
        addMarkers(photo);
      });

      if (mapRef.current && mSelectedShape) {
        const selectedShape = mSelectedShape.data;
        const ogc_fid = [selectedShape.id];
        mapRef.current?.jumpTo({
          center: [selectedShape.properties.longitude, selectedShape.properties.latitude],
          zoom: 10,
        });
        mapRef.current?.setFilter('shapes-layer-highlighted', [
          'in',
          'ogc_fid',
          ...ogc_fid
        ]);
        insertMarkers();
      } else {
        insertMarkerSymbols();
      }


      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
      });

      mapRef.current?.on('mouseenter', 'shapes-layer', (e) => {
        mapRef.current && (mapRef.current.getCanvas().style.cursor = 'pointer');

        const coordinates = e.features && (e.features[0].geometry as any).coordinates?.slice();
        const description = e.features && e.features[0] && e.features[0].properties?.wd24nm;      

        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        popup.setLngLat(e.lngLat).setHTML(description).addTo(mapRef.current!);
      });

      mapRef.current?.on('mouseleave', 'shapes-layer', () => {
        mapRef.current && (mapRef.current.getCanvas().style.cursor = '');
        popup.remove();
      });

      mapRef.current?.on("zoom", () => {
        updateMarkers();
      });

    });
  };

  const addMarkerSymbols = (data_: any) => {
    const marker = new mapboxgl.Marker().setLngLat([data_.lng, data_.lat]);
    markerRefSymbols.current.push(marker);
  };

  const addMarkers = (data_: any) => {
    const el = document.createElement("div");
    const root = createRoot(el);
    root.render(<TaskPhoto data={{...data_, farmer_name: '', name: '', photo: data_, id: data_.id}} />);
    const marker = new mapboxgl.Marker(el).setLngLat([data_.lng, data_.lat]);
    markerRef.current.push(marker);
  };

  const insertMarkers = () => {
    try {
      markerRef.current.forEach((marker: any) => {
        if (!marker.getElement().parentElement) {
          marker.addTo(mapRef.current);
        }
      });
    } catch (err) { }
  }

  const insertMarkerSymbols = () => {
    try {
      markerRefSymbols.current.forEach((marker: any) => {
        if (!marker.getElement().parentElement) {
          marker.addTo(mapRef.current);
        }
      });
    } catch (err) { }
  }

  const updateMarkers = () => {
    const zoomLevel: number | undefined = mapRef.current?.getZoom();
    if (zoomLevel! > 8) {
      insertMarkers();
      markerRefSymbols.current.forEach((marker: any) => {
        if (marker.getElement().parentElement) {
          marker.remove();
        }
      });
    } else {
      insertMarkerSymbols();
      markerRef.current.forEach((marker: any) => {
        if (marker.getElement().parentElement) {
          marker.remove();
        }
      });
    }
  };

  const applyFilters = (params: { search?: string; bbox?: string; ogc_fid?: string}) => {
    router.visit(route('search.index'), {
      method: 'get',
      preserveState: true,
      data: {
        ogc_fid: params.ogc_fid || '',
        search: params.search || '',
      },
      except: ['shapes'],
    });
  }

  return (
    <>
    <header className="bg-white">
      <nav aria-label="Global" className="mx-auto flex items-center justify-between p-6 lg:px-8">
        <div className="flex lg:flex-1">
          <Link href="/search" className="-m-1.5 p-1.5">
            <span className="sr-only">PIC2BIM</span>
            <img
              alt=""
              src="/logo_egnss4all.svg"
              className="h-8 w-auto"
            />
          </Link>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
          >
            <span className="sr-only">Open main menu</span>
            <FontAwesomeIcon aria-hidden="true" icon={faGripVertical} className="size-6" />
          </button>
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:gap-x-2 justify-between items-center">
          <div className="flex-1">
            <input
              type="text"
              id="search"
              name="search"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              placeholder="Search..."
            />
          </div>
          <div>
            <select id="sort" name="sort" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option>Newest</option>
              <option>Name</option>
              <option>Date</option>
            </select>
          </div>
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-12">
          <PopoverGroup className="hidden lg:flex lg:gap-x-12">
            <a href="/" className="text-sm/6 font-semibold text-gray-900">
              Dashboard
            </a>
            <a href="/search" className="text-sm/6 font-semibold text-gray-900">
              Search
            </a>
            <a href="#" className="text-sm/6 font-semibold text-gray-900">
              About
            </a>
            {auth.user && 
              <Popover>
                <PopoverButton className="flex items-center gap-x-1 text-sm/6 font-semibold text-gray-900 focus:outline-none data-[active]:text-black data-[hover]:text-black data-[focus]:outline-1 data-[focus]:text-black">
                  {auth.user.name}
                  <ChevronDownIcon aria-hidden="true" className="size-5 flex-none text-gray-400" />
                </PopoverButton>
                <PopoverPanel 
                  transition
                  anchor="bottom"
                  className="divide-y text-sm/6 transition duration-200 ease-in-out [--anchor-gap:var(--spacing-5)] data-[closed]:-translate-y-1 data-[closed]:opacity-0">
                  <div className="p-3 -ml-3">
                    <Link href="/profile" className="block rounded-lg py-2 px-3 transition text-gray-900 hover:text-black">Profile</Link>
                    <Link href="/logout" className="block rounded-lg py-2 px-3 transition text-gray-900 hover:text-black">Logout</Link>
                  </div>
                </PopoverPanel>
              </Popover>
            }
          </PopoverGroup>
          {!auth.user &&
          <a href="/login" className="text-sm/6 font-semibold text-gray-900">
            Log in <span aria-hidden="true">&rarr;</span>
          </a>
          }
        </div>
      </nav>
      <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
        <div className="fixed inset-0 z-10" />
        <DialogPanel className="fixed inset-y-0 right-0 z-10 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="flex items-center justify-between">
            <Link href="/" className="-m-1.5 p-1.5">
              <span className="sr-only">PIC2BIM</span>
              <img
                alt=""
                src="/logo_egnss4all.svg"
                className="h-8 w-auto"
              />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="-m-2.5 rounded-md p-2.5 text-gray-700"
            >
              <span className="sr-only">Close menu</span>
              <FontAwesomeIcon aria-hidden="true" icon={faClose} className="size-6" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-gray-500/10">
              <div className="space-y-2 py-6">
                <a
                  href="/"
                  className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                >
                  Dashboard
                </a>
                <a
                  href="/search"
                  className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                >
                  Search
                </a>
                <a
                  href="#"
                  className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                >
                  About
                </a>
              </div>
              <div className="py-6">
                {!auth.user ?
                  <a
                    href="/login"
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                  >
                    Log in
                  </a>
                  :
                  <Disclosure as="div" className="-mx-3">
                    <DisclosureButton className="group flex w-full items-center justify-between rounded-lg py-2 pr-3.5 pl-3 text-base/7 font-semibold text-gray-900 hover:bg-gray-50">
                      {auth.user.name}
                      <ChevronDownIcon aria-hidden="true" className="size-5 flex-none group-data-open:rotate-180" />
                    </DisclosureButton>
                    <DisclosurePanel className="mt-2 space-y-2">
                        <DisclosureButton
                          as="a"
                          href={"/profile"}
                          className="block rounded-lg py-2 pr-3 pl-6 text-sm/7 font-semibold text-gray-900 hover:bg-gray-50"
                        >
                          Profile
                        </DisclosureButton>
                        <DisclosureButton
                          as="a"
                          href={"/logout"}
                          className="block rounded-lg py-2 pr-3 pl-6 text-sm/7 font-semibold text-gray-900 hover:bg-gray-50"
                        >
                          Logout
                        </DisclosureButton>
                    </DisclosurePanel>
                  </Disclosure>
                }
              </div>
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </header>

    
    
    <div className="mx-auto px-4 sm:px-6 lg:px-8 my-6">
      <div className="lg:hidden flex justify-between items-center mb-6 gap-2">
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search</label>
          <input
            type="text"
            id="search"
            name="search"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            placeholder="Search..."
          />
        </div>
        <div>
          <label htmlFor="sort" className="block text-sm font-medium text-gray-700">Sort By</label>
          <select id="sort" name="sort" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option>Newest</option>
            <option>Name</option>
            <option>Date</option>
          </select>
        </div>
      </div>
      <div className='h-screen'>
        <div
          id="map-container"
          ref={mapContainerRef}
          className="w-full h-4/5 rounded-xl shadow-md overflow-hidden "
        />
      </div>
      <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900">Workspace</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {photos && photos.data && photos.data.length > 0 && photos.data.map((photo, index) => (
          <Link key={index} href='/search/photos-in-united-kingdom'>
            <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl">
              <img className=" h-72 w-full object-cover" src={photo?.link ? photo.link : '/images/dummy-image.jpg'} alt={photo.note+""} />
              <div className="p-8">
                <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">{photo.note ? photo.note: photo.created}</div>
                <p className="mt-2 text-gray-500">{`This photo was taken at ${photo.created} UTC. The device used has an accuracy of ${photo.accuracy}. The GPS coordinates are: Latitude: ${photo.lat}, Longitude: ${photo.lng}, and Altitude: ${photo.altitude} meters. The GNSS distance is ${photo.distance}.`}</p>
              </div>
            </div>
          </Link>
        ))}
        {photos && photos.data && photos.data.length == 0 && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl">
              <div className="p-8">
                <div className="uppercase tracking-wide text-sm text-gray-800 font-semibold">No data with given query.</div>
                <p className="mt-2 text-gray-500">{`The given query yielded no results. This indicates that the search criteria or parameters specified within the query did not match any existing data within the system or database being queried.`}</p>
              </div>
            </div>
        )}
      </div>
    </div>

    </>
  );
}

export default memo(Index);