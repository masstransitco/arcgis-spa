// src/components/MapView.js
import React, { useEffect, useRef, useState } from 'react';
import './MapView.css';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import Sidebar from './Sidebar';

// Import ArcGIS modules
import WebScene from '@arcgis/core/WebScene';
import SceneView from '@arcgis/core/views/SceneView';

const MapViewComponent = () => {
  const mapContainerRef = useRef(null); // Reference to the container div
  const view3DRef = useRef(null);       // Reference to the SceneView instance
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [viewsReady, setViewsReady] = useState(false);
  const [is3DLoading, setIs3DLoading] = useState(true);

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
            id: '4304b6c3b2084330b4a2153da9fbbcf0' // Your WebScene ID
          }
        });

        const sceneView = new SceneView({
          container: container,
          map: scene,
          ui: { components: [] } // Hide default UI components
        });

        await sceneView.when();
        console.log('3D Scene initialized');

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
      mapContainerRef.current.removeChild(container);
    };
  }, []); // Empty dependency array

  const view2DRef = useRef(null);

  // Callback to receive view2D from Sidebar.js
  const handleView2D = (mapView) => {
    console.log('Received view2D:', mapView);
    view2DRef.current = mapView;
    if (view3DRef.current) {
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
              animate: false
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
      const handle2DViewChange = view2DRef.current.watch(['center', 'zoom'], () => {
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
              animate: false
            })
            .catch((error) => {
              console.error('Error in 3D goTo:', error);
            })
            .finally(() => {
              syncing = false;
            });
        }, 100);
      });

      // Cleanup watchers on unmount
      return () => {
        if (handle3DCameraChange) {
          handle3DCameraChange.remove();
        }
        if (handle2DViewChange) {
          handle2DViewChange.remove();
        }
        clearTimeout(timeoutId);
      };
    }
  }, [viewsReady]);

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  return (
    <div className="map-container">
      {/* Logo */}
      <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="Logo" className="logo" />

      {/* 3D Scene */}
      <div className="scene-view" ref={mapContainerRef}>
        {is3DLoading && <div className="loading-overlay">Loading 3D Map...</div>}
      </div>

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-tab" onClick={toggleSidebar}>
          {isSidebarExpanded ? <FaChevronDown /> : <FaChevronUp />}
        </div>
        <Sidebar onView2DInit={handleView2D} isVisible={isSidebarExpanded} />
      </div>
    </div>
  );
};

export default MapViewComponent;
