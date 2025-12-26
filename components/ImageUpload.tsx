import React, { useRef } from 'react';

interface ImageUploadProps {
  label: string;
  imageSrc: string | null;
  onUpload: (base64: string) => void;
  placeholderText: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ label, imageSrc, onUpload, placeholderText }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onUpload(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">{label}</span>
      <div 
        onClick={triggerUpload}
        className={`
          relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-dashed cursor-pointer transition-all duration-300
          ${imageSrc ? 'border-transparent shadow-lg' : 'border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-white'}
        `}
      >
        {imageSrc ? (
          <img src={imageSrc} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">{placeholderText}</span>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      </div>
    </div>
  );
};

export default ImageUpload;