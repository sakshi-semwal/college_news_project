import React from 'react';
import '../Css/SelectCategoryPageCard.css';

export const SelectCategoryPageCard = ({ title, color, imageUrl }) => {
  const colorClass = `genre-${color}`;

  return (
    <div className={`genre-card ${colorClass}`}>
      <div className='genre-card-content'>
        <h2 className='genre-card-title'>{title}</h2>
        <div className='genre-card-image-container'>
          <img src={imageUrl} alt={title} className='genre-card-image' />
        </div>
      </div>
    </div>
  );
};
