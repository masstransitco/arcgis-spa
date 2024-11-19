// src/components/Sidebar.js

import React, { useEffect, useRef, useState } from 'react';
import './Sidebar.css';
import MapView from '@arcgis/core/views/MapView';
import WebMap from '@arcgis/core/WebMap';

const Sidebar = ({ onView2DInit, isVisible }) => {
  const mapContainerRef = useRef(null);
  const mapViewInstanceRef = useRef(null);
  const [is2DLoading, setIs2DLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Create container div for the map
    const container = document.createElement('div');
    container.style.height = '100%';
    container.style.width = '100%';
    mapContainerRef.current.appendChild(container);

    // Initialize WebMap (2D)
    const webMap = new WebMap({
      portalItem: {
        id: '2e977a0d176b4bb582b9d4d643dfcc4d' // Your WebMap ID
      }
    });

    // Initialize MapView for Sidebar
    const mapView = new MapView({
      container: container,
      map: webMap,
      ui: { components: [] }, // Hide default UI components
      popup: { dockEnabled: false } // Disable popups
    });

    mapViewInstanceRef.current = mapView;

    mapView
      .when(() => {
        console.log('2D MapView initialized');
        if (isMounted && onView2DInit) {
          onView2DInit(mapView);
          setIs2DLoading(false);
        }
      })
      .catch((error) => {
        if (isMounted) {
          console.error('Error initializing 2D MapView:', error);
        }
      });

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (mapViewInstanceRef.current) {
        mapViewInstanceRef.current.container = null;
        mapViewInstanceRef.current.destroy();
      }
      // Remove the container div
      if (mapContainerRef.current && container) {
        mapContainerRef.current.removeChild(container);
      }
    };
  }, []); // Empty dependency array

  return (
    <div className={`sidebar-content ${isVisible ? '' : 'hidden'}`}>
      <div className="sidebar-map" ref={mapContainerRef}>
        {is2DLoading && <div className="loading-overlay">Loading 2D Map...</div>}
      </div>
    </div>
  );
};

export default Sidebar;
