import { useState, useEffect } from 'react';
import { IoClose, IoArrowBack, IoArrowForward } from 'react-icons/io5';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  currentIndex: number;
  title?: string;
}

const ImageModal = ({
  isOpen,
  onClose,
  images,
  currentIndex,
  title,
}: ImageModalProps) => {
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(currentIndex);
    }
  }, [isOpen, currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrevious();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, activeIndex]);

  if (!isOpen) return null;

  const handlePrevious = () => {
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setIsLoading(true);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setIsLoading(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center">
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 px-4 py-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent">
          <h3 className="text-white text-lg font-medium truncate">
            {title || `Image ${activeIndex + 1} of ${images.length}`}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors">
            <IoClose size={24} />
          </button>
        </div>

        {/* Main Image */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-12">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <img
            src={images[activeIndex]}
            alt={`Gallery image ${activeIndex + 1}`}
            className="max-h-full max-w-full object-contain shadow-2xl rounded-md transition-opacity duration-300"
            style={{ opacity: isLoading ? 0.5 : 1 }}
            onLoad={() => setIsLoading(false)}
          />
        </div>

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-20">
              <IoArrowBack size={20} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-20">
              <IoArrowForward size={20} />
            </button>
          </>
        )}

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-10 px-4 py-4 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex justify-center gap-2 overflow-x-auto py-2 scrollbar-hide">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setActiveIndex(index);
                    setIsLoading(true);
                  }}
                  className={`relative flex-shrink-0 h-16 w-16 md:h-20 md:w-20 overflow-hidden rounded-md focus:outline-none ${
                    activeIndex === index
                      ? 'ring-2 ring-blue-500'
                      : 'opacity-60 hover:opacity-100'
                  }`}>
                  <img
                    src={img}
                    alt={`Thumbnail ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Image counter dots (for mobile) */}
        <div className="absolute bottom-24 left-0 right-0 z-10 flex justify-center gap-1 md:hidden">
          {images.length > 1 &&
            images.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveIndex(index);
                  setIsLoading(true);
                }}
                className={`w-2 h-2 rounded-full ${
                  activeIndex === index ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
