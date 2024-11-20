// src/components/Sidebar2.js

import React from 'react';
import './Sidebar2.css';

const Sidebar2 = ({ isVisible, feature, onClose }) => {
  if (!feature) return null;

  return (
    <div
      className={`sidebar2 ${isVisible ? 'visible' : 'hidden'}`}
      onClick={onClose}
    >
      <div className="sidebar2-content" onClick={(e) => e.stopPropagation()}>
        {/* Display feature information */}
        <h2>Feature Details</h2>
        <p>Name: {feature.attributes.Name}</p>
        {/* Add more details as needed */}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default Sidebar2;
