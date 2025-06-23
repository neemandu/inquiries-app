'use client';

import React, { useState, useRef } from 'react';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  isMandatory?: boolean;
}

export const FileUploadComponent = ({ onFilesChange, isMandatory = false }: FileUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileAdd = (newFiles: FileList) => {
    const newFilesArray = Array.from(newFiles);
    const updatedFiles = [...files];
    
    newFilesArray.forEach(newFile => {
      if (!updatedFiles.some(existing => existing.name === newFile.name && existing.size === newFile.size)) {
        updatedFiles.push(newFile);
      }
    });
    
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
              handleFileAdd(e.target.files);
            }
          }}
          required={isMandatory && files.length === 0}
        />
        <button
          type="button"
          className="custom-file-button"
          onClick={() => inputRef.current?.click()}
        >
          בחרו קבצים {isMandatory && <span style={{color: 'red'}}>*</span>}
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