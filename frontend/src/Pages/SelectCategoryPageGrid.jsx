import React from 'react';
// import { GenreCard } from './GenreCard';
import '../Css/SelectCategoryPageGrid.css';
import { SelectCategoryPageCard } from './SelectCategoryPageCard';
import { genres } from '../utils/Category';

export const SelectCategoryPageGrid = () => {
  return (
    <div className='genre-grid'>
      {genres.map((genre, index) => (
        <SelectCategoryPageCard
          key={index}
          title={genre.title}
          color={genre.color.replace('bg-', '')}
          imageUrl={genre.imageUrl}
        />
      ))}
    </div>
  );
};
