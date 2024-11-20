// src/components/MapView.js

import React, { useEffect, useRef, useState } from 'react';
import './MapView.css';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import Sidebar from './Sidebar';
import Sidebar2 from './Sidebar2';

// Import ArcGIS modules
import WebScene from '@arcgis/core/WebScene';
import SceneView from '@arcgis/core/views/SceneView';

const MapViewComponent = () => {
  const mapContainerRef = useRef(null);
  const view3DRef = useRef(null);
  const view2DRef = useRef(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [is3DLoading, setIs3DLoading] = useState(true);
  const [viewsReady, setViewsReady] = useState(false);
  const [isSidebar2Visible, setIsSidebar2Visible] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Initialize 3D Map
  useEffect(() => {
    let isMounted = true;

    // Create container div for the map
    const container = document.createElement('div');
    container.style.height = '100%';
    container.style.width = '100%';
    mapContainerRef.current.appendChild(container);

    const initWebScene = async () => {
      try {
        const scene = new WebScene({
          portalItem: {
            id: '4304b6c3b2084330b4a2153da9fbbcf0', // Your WebScene ID
          },
        });

        const sceneView = new SceneView({
          container: container,
          map: scene,
          ui: { components: [] }, // Hide default UI components
          constraints: {
            altitude: {
              min: 0, // Prevent camera from going underground
            },
            tilt: {
              max: 90,
              min: 0,
            },
          },
        });

        await sceneView.when();
        console.log('3D Scene initialized');

        // Apply Slide "1"
        const slides = scene.presentation.slides;
        const slide1 =
          slides.find((slide) => slide.title.text === 'Slide 1') ||
          slides.getItemAt(0);
        if (slide1) {
          await slide1.applyTo(sceneView);
          console.log('Applied Slide 1 to SceneView');
        }

        if (isMounted) {
          view3DRef.current = sceneView;
          setIs3DLoading(false);
          if (view2DRef.current) {
            setViewsReady(true);
          }
        } else {
          sceneView.container = null;
          sceneView.destroy();
        }
      } catch (error) {
        console.error('Error initializing WebScene:', error);
        if (isMounted) setIs3DLoading(false);
      }
    };

    initWebScene();

    return () => {
      isMounted = false;
      if (view3DRef.current) {
        view3DRef.current.container = null;
        view3DRef.current.destroy();
      }
      // Remove the container div
      if (mapContainerRef.current && container) {
        mapContainerRef.current.removeChild(container);
      }
    };
  }, []);

  // Callback to receive view2D from Sidebar.js
  const handleView2D = (mapView) => {
    console.log('Received view2D:', mapView);
    view2DRef.current = mapView;

    if (view3DRef.current) {
      // Synchronize initial view
      const camera = view3DRef.current.camera.clone();
      const center = [camera.position.longitude, camera.position.latitude];

      // Set 2D map center and adjust zoom level
      view2DRef.current.center = center;
      view2DRef.current.zoom = view2DRef.current.zoom - 1; // Zoom out by one level

      setViewsReady(true);
    }
  };

  // Synchronization Logic
  useEffect(() => {
    if (viewsReady) {
      console.log('Starting synchronization');
      let syncing = false;
      let timeoutId;

      // When 3D view changes, update 2D view
      const handle3DCameraChange = view3DRef.current.watch('camera', () => {
        if (syncing) return;
        syncing = true;
        const { longitude, latitude } = view3DRef.current.camera.position;
        const zoom = view2DRef.current.zoom;

        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          view2DRef.current
            .goTo({
              center: [longitude, latitude],
              zoom: zoom,
              animate: false,
            })
            .catch((error) => {
              console.error('Error in 2D goTo:', error);
            })
            .finally(() => {
              syncing = false;
            });
        }, 100);
      });

      // When 2D view changes, update 3D view
      const handle2DViewChange = view2DRef.current.watch(
        ['center', 'zoom'],
        () => {
          if (syncing) return;
          syncing = true;
          const center = view2DRef.current.center;
          const zoom = view2DRef.current.zoom;
          const tilt = view3DRef.current.camera.tilt;
          const heading = view3DRef.current.camera.heading;

          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            view3DRef.current
              .goTo({
                center: center,
                zoom: zoom,
                tilt: tilt,
                heading: heading,
                animate: false,
              })
              .catch((error) => {
                console.error('Error in 3D goTo:', error);
              })
              .finally(() => {
                syncing = false;
              });
          }, 100);
        }
      );

      // Add click event handlers for feature selection
      const handle3DClick = view3DRef.current.on('click', (event) => {
        selectFeature(event.mapPoint, view3DRef.current);
      });

      const handle2DClick = view2DRef.current.on('click', (event) => {
        selectFeature(event.mapPoint, view2DRef.current);
      });

      // Cleanup watchers and event handlers on unmount
      return () => {
        if (handle3DCameraChange) {
          handle3DCameraChange.remove();
        }
        if (handle2DViewChange) {
          handle2DViewChange.remove();
        }
        if (handle3DClick) {
          handle3DClick.remove();
        }
        if (handle2DClick) {
          handle2DClick.remove();
        }
        clearTimeout(timeoutId);
      };
    }
  }, [viewsReady]);

  // Function to select feature
  const selectFeature = async (mapPoint, view) => {
    try {
      // HitTestOptions to only return visible features
      const hitTestResult = await view.hitTest(mapPoint, {
        include: view.map.layers,
      });

      if (hitTestResult.results.length > 0) {
        const graphic = hitTestResult.results[0].graphic;
        console.log('Feature selected:', graphic);

        // Perform actions based on the selected feature
        handleFeatureSelection(graphic);
      }
    } catch (error) {
      console.error('Error during feature selection:', error);
    }
  };

  // Function to handle feature selection
  const handleFeatureSelection = (graphic) => {
    // Check if the selected feature is "Yau Tsim Mong" in "District" layer
    if (
      graphic.layer.title === 'District' &&
      graphic.attributes.Name === 'Yau Tsim Mong'
    ) {
      // Apply Slide "2"
      const slides = view3DRef.current.map.presentation.slides;
      const slide2 = slides.find((slide) => slide.title.text === 'Slide 2');

      if (slide2) {
        slide2.applyTo(view3DRef.current);
        console.log('Applied Slide 2 to SceneView');
      }

      // Adjust 2D map to zoom to the "Stations" within "Yau Tsim Mong"
      zoomToStationsInDistrict('Yau Tsim Mong');
    }

    // Open Sidebar2 with feature details
    openSidebar2(graphic);
  };

  // Function to zoom 2D map to stations in district
  const zoomToStationsInDistrict = async (districtName) => {
    const stationsLayer = view2DRef.current.map.findLayerById('StationsLayerId'); // Replace with actual layer ID
    const districtLayer = view2DRef.current.map.findLayerById('DistrictLayerId'); // Replace with actual layer ID

    if (!stationsLayer || !districtLayer) {
      console.error('Stations layer or District layer not found in 2D map.');
      return;
    }

    // Query the district geometry
    const districtQuery = districtLayer.createQuery();
    districtQuery.where = `Name = '${districtName}'`;

    const districtResult = await districtLayer.queryFeatures(districtQuery);
    if (districtResult.features.length > 0) {
      const districtGeometry = districtResult.features[0].geometry;

      // Query stations within the district
      const stationsQuery = stationsLayer.createQuery();
      stationsQuery.geometry = districtGeometry;
      stationsQuery.spatialRelationship = 'intersects';

      const stationsResult = await stationsLayer.queryFeatures(stationsQuery);

      if (stationsResult.features.length > 0) {
        // Zoom to the extent of the stations
        const stationsExtent = stationsResult.features[0].geometry.extent.clone();
        stationsResult.features.forEach((feature) => {
          stationsExtent.union(feature.geometry.extent);
        });

        await view2DRef.current.goTo(stationsExtent.expand(1.2)); // Adjust as needed
      } else {
        console.log('No stations found within the selected district.');
      }
    } else {
      console.log('District not found.');
    }
  };

  // Function to open Sidebar2
  const openSidebar2 = (graphic) => {
    setSelectedFeature(graphic);
    setIsSidebar2Visible(true);
  };

  // Function to close Sidebar2
  const closeSidebar2 = () => {
    setIsSidebar2Visible(false);
    setSelectedFeature(null);
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  console.log('isSidebarExpanded:', isSidebarExpanded);

  return (
    <div className="map-container">
      {/* Logo */}
      <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="Logo" className="logo" />

      {/* 3D Scene */}
      <div className="scene-view" ref={mapContainerRef}>
        {is3DLoading && <div className="loading-overlay">Loading 3D Map...</div>}
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${isSidebarExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="sidebar-tab" onClick={toggleSidebar}>
          {isSidebarExpanded ? <FaChevronDown /> : <FaChevronUp />}
        </div>
        <Sidebar onView2DInit={handleView2D} isVisible={isSidebarExpanded} />
      </div>

      {/* Sidebar2 */}
      <Sidebar2
        isVisible={isSidebar2Visible}
        feature={selectedFeature}
        onClose={closeSidebar2}
      />
    </div>
  );
};

export default MapViewComponent;
