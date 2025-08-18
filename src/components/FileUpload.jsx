import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Image } from 'lucide-react';

const FileUpload = ({ 
  files, 
  onFilesChange, 
  acceptedFileTypes, 
  maxFiles = 10,
  fileType = 'document' // 'document' or 'photo'
}) => {
  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: fileType === 'photo' ? URL.createObjectURL(file) : null
    }));
    
    // For documents with maxFiles = 1, replace the existing file
    if (fileType === 'document' && maxFiles === 1) {
      onFilesChange(newFiles);
    } else {
      onFilesChange([...files, ...newFiles]);
    }
  }, [files, onFilesChange, fileType, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxFiles: maxFiles === 1 ? 1 : maxFiles - files.length,
    disabled: files.length >= maxFiles && maxFiles > 1
  });

  const removeFile = (fileId) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    onFilesChange(updatedFiles);
  };

  const getFileIcon = (fileName) => {
    if (fileType === 'photo') return Image;
    return FileText;
  };

  const getAcceptedFormats = () => {
    if (fileType === 'photo') {
      return 'JPG, PNG (Maks. 10MB per file)';
    } else {
      return 'PDF (Maks. 5MB per file)';
    }
  };

  const truncateFileName = (fileName, maxLength = 30) => {
    if (fileName.length <= maxLength) return fileName;
    
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4);
    
    return `${truncatedName}...${extension}`;
  };

  const isMaxFilesReached = files.length >= maxFiles && maxFiles > 1;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-primary bg-primary/5' 
            : isMaxFilesReached
            ? 'border-base-300 bg-base-200 cursor-not-allowed'
            : 'border-base-300 hover:border-primary hover:bg-primary/5'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-base-200 rounded-full">
            <Upload className={`w-8 h-8 ${isMaxFilesReached ? 'text-base-content/40' : 'text-primary'}`} />
          </div>
          
          {isMaxFilesReached ? (
            <div>
              <p className="text-base-content/60">Maksimal {maxFiles} file tercapai</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-semibold text-base-content">
                {isDragActive 
                  ? 'Lepaskan file di sini' 
                  : maxFiles === 1 
                    ? `Pilih ${fileType === 'photo' ? 'foto' : 'dokumen'} Anda`
                    : `Drag & drop ${fileType === 'photo' ? 'foto' : 'dokumen'} Anda`
                }
              </p>
              <p className="text-base-content/70">
                {maxFiles === 1 
                  ? <span className="text-primary font-semibold">klik untuk memilih file</span>
                  : <>atau <span className="text-primary font-semibold">klik untuk memilih file</span></>
                }
              </p>
              <p className="text-sm text-base-content/60 mt-2">
                Format: {getAcceptedFormats()}
              </p>
              {maxFiles === 1 && (
                <p className="text-sm text-info mt-1">
                  Hanya satu file yang diperbolehkan
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-base-content">
            {maxFiles === 1 
              ? 'File yang dipilih'
              : `File yang dipilih (${files.length}/${maxFiles})`
            }
          </h4>
          
          {fileType === 'photo' ? (
            // Photo Grid Preview
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {files.map((fileItem) => {
                const FileIcon = getFileIcon(fileItem.file.name);
                return (
                  <div key={fileItem.id} className="relative group">
                    <div className="aspect-square bg-base-200 rounded-lg overflow-hidden">
                      {fileItem.preview ? (
                        <img 
                          src={fileItem.preview} 
                          alt={fileItem.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileIcon className="w-8 h-8 text-base-content/60" />
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => removeFile(fileItem.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-error rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <p className="text-xs text-base-content/70 mt-1 truncate" title={fileItem.file.name}>
                      {truncateFileName(fileItem.file.name, 20)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            // Document List
            <div className="space-y-2">
              {files.map((fileItem) => {
                const FileIcon = getFileIcon(fileItem.file.name);
                return (
                  <div key={fileItem.id} className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileIcon className="w-6 h-6 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-base-content truncate" title={fileItem.file.name}>
                          {truncateFileName(fileItem.file.name, 40)}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-base-content/70">
                          <span>{(fileItem.file.size / 1024 / 1024).toFixed(2)} MB</span>
                          <span>•</span>
                          <span className="truncate">{fileItem.file.type}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => removeFile(fileItem.id)}
                      className="btn btn-ghost btn-sm text-error hover:bg-error/10 flex-shrink-0 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;