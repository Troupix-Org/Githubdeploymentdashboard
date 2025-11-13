import React from 'react';
import PropTypes from 'prop-types';

/**
 * IconComponent - A reusable component for displaying SVG icons
 * 
 * @param {string} name - The name of the icon to display
 * @param {string} color - Color for the icon (primary, success, warning, error, info, muted, accent, or custom CSS color)
 * @param {string} size - Size of the icon (sm, md, lg, or custom size in px)
 * @param {string} className - Additional CSS classes
 * @param {function} onClick - Optional click handler
 */
const IconComponent = ({ name, color, size, className, onClick }) => {
  // Map size strings to pixel values
  const sizeMap = {
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
  };
  
  // Determine the final size value
  const finalSize = sizeMap[size] || size || '24px';
  
  // Import the SVG dynamically
  const iconPath = `/assets/icons/${name}.svg`;
  
  // Define color filters for different semantic colors
  // These CSS variables should be defined in your global CSS
  const colorFilters = {
    primary: 'var(--icon-color-primary, invert(39%) sepia(40%) saturate(1000%) hue-rotate(235deg) brightness(90%) contrast(95%))',
    secondary: 'var(--icon-color-secondary, invert(50%) sepia(12%) saturate(1200%) hue-rotate(180deg) brightness(90%) contrast(90%))',
    success: 'var(--icon-color-success, invert(56%) sepia(75%) saturate(409%) hue-rotate(93deg) brightness(93%) contrast(91%))',
    warning: 'var(--icon-color-warning, invert(77%) sepia(38%) saturate(5392%) hue-rotate(359deg) brightness(105%) contrast(104%))',
    error: 'var(--icon-color-error, invert(39%) sepia(59%) saturate(2576%) hue-rotate(337deg) brightness(100%) contrast(91%))',
    info: 'var(--icon-color-info, invert(67%) sepia(33%) saturate(5836%) hue-rotate(184deg) brightness(101%) contrast(101%))',
    muted: 'var(--icon-color-muted, invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(90%) contrast(80%))',
    accent: 'var(--icon-color-accent, invert(56%) sepia(86%) saturate(1913%) hue-rotate(300deg) brightness(100%) contrast(96%))',
    light: 'var(--icon-color-light, invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%))',
    dark: 'var(--icon-color-dark, invert(0%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(0%) contrast(100%))',
    linear: 'var(--icon-color-linear, invert(50%) sepia(10%) saturate(500%) hue-rotate(180deg) brightness(95%) contrast(85%))',
  };
  
  // Get the filter value based on the color prop
  const getFilterValue = () => {
    if (!color) return undefined;
    
    // If it's a predefined color, use the filter
    if (colorFilters[color]) {
      return colorFilters[color];
    }
    
    // If it's a custom CSS variable
    if (color.startsWith('--')) {
      return `var(${color}, none)`;
    }
    
    // For backward compatibility
    return `var(--icon-color-${color}, none)`;
  };
  
  return (
    <div 
      className={`icon-component ${className || ''} ${color ? `icon-${color}` : ''}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        width: finalSize,
        height: finalSize,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <img 
        src={iconPath}
        alt={`${name} icon`}
        style={{
          width: '100%',
          height: '100%',
          filter: getFilterValue(),
        }}
      />
    </div>
  );
};

IconComponent.propTypes = {
  name: PropTypes.string.isRequired,
  color: PropTypes.string,
  size: PropTypes.string,
  className: PropTypes.string,
  onClick: PropTypes.func,
};

export default IconComponent;