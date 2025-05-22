import { useState } from 'react';
import placeholder from '../../assets/logo_black.jpg';
import { IoSearch } from 'react-icons/io5';

interface ImageGalleryProps {
  images: string[];
  title: string;
  getImageUrl: (path: string) => string;
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onImageClick?: (index: number) => void;
}

const ImageGallery = ({
  images,
  title,
  getImageUrl,
  handleImageError,
  onImageClick,
}: ImageGalleryProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent onClick
    if (!images || images.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent onClick
    if (!images || images.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleImageClick = () => {
    if (onImageClick) {
      onImageClick(currentImageIndex);
    }
  };

  return (
    <div
      className="relative rounded-xl overflow-hidden aspect-[16/9] mb-6 bg-gray-200 dark:bg-gray-700 group"
      onClick={handleImageClick}>
      {images && images.length > 0 ? (
        <img
          src={getImageUrl(images[currentImageIndex])}
          alt={`${title} - Image ${currentImageIndex + 1}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={handleImageError}
        />
      ) : (
        <img
          src={placeholder}
          alt="No image available"
          className="w-full h-full object-cover"
        />
      )}

      {/* Image navigation - only show if multiple images */}
      {images && images.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/70 dark:bg-black/50 flex items-center justify-center hover:bg-white dark:hover:bg-black/70 transition"
            aria-label="Previous image">
            &#10094;
          </button>
          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/70 dark:bg-black/50 flex items-center justify-center hover:bg-white dark:hover:bg-black/70 transition"
            aria-label="Next image">
            &#10095;
          </button>

          {/* Image counter */}
          <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentImageIndex + 1} / {images.length}
          </div>
        </>
      )}

      {/* Expand icon/overlay */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="p-3 bg-white/70 dark:bg-darkBlue/70 rounded-full">
          <IoSearch className="w-6 h-6 text-darkBlue dark:text-white" />
        </div>
      </div>
    </div>
  );
};

export default ImageGallery;
