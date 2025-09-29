'use client';

import React, { useState, useRef } from 'react';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  isMandatory: boolean;
}

export const FileUploadComponent = ({ onFilesChange, isMandatory = false }: FileUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compress images on the client to reduce upload size
  const compressImageFile = (file: File, maxDimension = 1280, quality = 0.7): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          let { width, height } = img;
          const scale = Math.min(1, maxDimension / Math.max(width, height));
          width = Math.floor(width * scale);
          height = Math.floor(height * scale);
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Prefer JPEG for better compression
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const newFileName = file.name.replace(/\.(png|jpeg|jpg)$/i, '') + '.jpg';
              const compressed = new File([blob], newFileName, { type: 'image/jpeg', lastModified: Date.now() });
              resolve(compressed);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleFileAdd = async (newFiles: FileList) => {
    const newFilesArray = Array.from(newFiles);
    const updatedFiles = [...files];

    for (const newFile of newFilesArray) {
      let fileToAdd = newFile;
      // Compress images larger than 200KB
      if (newFile.type.startsWith('image/') && newFile.size > 200 * 1024) {
        try {
          fileToAdd = await compressImageFile(newFile);
        } catch {
          fileToAdd = newFile;
        }
      }
      // Avoid duplicates by name + size
      if (!updatedFiles.some(existing => existing.name === fileToAdd.name && existing.size === fileToAdd.size)) {
        updatedFiles.push(fileToAdd);
      }
    }

    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const handleFileRemove = (indexToRemove: number) => {
    const updatedFiles = files.filter((_, index) => index !== indexToRemove);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  return (
    <>
      <style jsx>{`
        .file-upload {
          position: relative;
          display: inline-block;
        }
        .custom-file-button {
          position: relative;
          display: inline-block;
          padding: 0.5em 1em;
          background: #007bff;
          color: white;
          border-radius: 4px;
          cursor: pointer;
          user-select: none;
          border: none;
        }
        .file-upload input[type="file"] {
          display: none !important;
        }
        .selected-files {
          margin-top: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .file-item {
          display: inline-block;
          background: #f0f0f0;
          padding: 0.2em 0.5em;
          margin: 0.2em;
          border-radius: 3px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .file-item button {
          margin-left: 0.5em;
          background: transparent;
          border: none;
          cursor: pointer;
          font-weight: bold;
        }
      `}</style>
      <div className="file-upload">
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) {
              void handleFileAdd(e.target.files);
            }
          }}
        />
        <button
          type="button"
          className="custom-file-button"
          onClick={() => inputRef.current?.click()}
        >
          בחרו קבצים {isMandatory && <span style={{ color: 'red' }}>*</span>}
        </button>
        <div className="selected-files">
          {files.map((file, index) => (
            <span key={index} className="file-item">
              {/* if file name is too long, show only the first 10 characters and add ...  and show full name when hover*/}
              <span title={file.name}>{file.name.length > 10 ? file.name.slice(0, 10) + '...' : file.name}</span>
              <button
                type="button"
                onClick={() => handleFileRemove(index)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    </>
  );
};

export default FileUploadComponent; 