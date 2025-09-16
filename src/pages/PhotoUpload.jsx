import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Image as ImageIcon, Calculator, Phone, ArrowRight, ArrowLeft, Plus, Minus, RotateCcw, Download, Upload, X, Camera } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePricing } from '../hooks/usePricing';
import { useStore } from '../store/useStore';
import { createJobAndInvoice, validateFile, validateFormData } from '../lib/api';
import toast from 'react-hot-toast';

const photoSchema = z.object({
  phoneNumber: z.string()
    .min(10, 'Nomor telepon minimal 10 digit')
    .max(15, 'Nomor telepon maksimal 15 digit')
    .regex(/^[0-9+]+$/, 'Nomor telepon hanya boleh berisi angka dan tanda +'),
  template: z.string({
    required_error: 'Pilih template'
  })
});

// Simplified Instagram-like templates - only portrait, 1, 2, and 4 photos
const TEMPLATES = [
  { 
    id: 'single', 
    name: 'Single Photo', 
    slots: 1, 
    layout: [[1]],
    gridCols: 1,
    gridRows: 1
  },
  { 
    id: 'double_vertical', 
    name: '2 Photos Vertical', 
    slots: 2, 
    layout: [[1], [2]],
    gridCols: 1,
    gridRows: 2
  },
  { 
    id: 'quad_grid', 
    name: '4 Photos Grid', 
    slots: 4, 
    layout: [[1, 2], [3, 4]],
    gridCols: 2,
    gridRows: 2
  }
];

// Helper function to truncate file names
const truncateFileName = (fileName, maxLength = 30) => {
  if (!fileName || typeof fileName !== 'string' || fileName.length <= maxLength) {
    return fileName || '';
  }
  
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return fileName.substring(0, maxLength - 3) + '...';
  }
  
  const extension = fileName.substring(lastDotIndex);
  const nameWithoutExt = fileName.substring(0, lastDotIndex);
  const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3);
  
  return `${truncatedName}...${extension}`;
};

const PhotoUpload = () => {
  const navigate = useNavigate();
  const [totalPrice, setTotalPrice] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState('template'); // template, upload, preview
  const [templatePhotos, setTemplatePhotos] = useState({});
  const [previewCanvas, setPreviewCanvas] = useState(null);
  const [activeSlot, setActiveSlot] = useState(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const { getPhotoPricingDisplay } = usePricing();
  const { setUploadedFiles, setCurrentOrder } = useStore();
  
  const pricingData = getPhotoPricingDisplay();
  const fourRPrice = pricingData?.sizes?.find(s => s.size === '4R')?.price || 5000;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm({
    resolver: zodResolver(photoSchema),
    defaultValues: {
      template: 'single'
    }
  });

  const template = watch('template');
  
  // Get the selected template object from TEMPLATES array
  const selectedTemplate = TEMPLATES.find(tmpl => tmpl.id === template);

  // Calculate total price - fixed at 4R price
  useEffect(() => {
    setTotalPrice(fourRPrice);
  }, [fourRPrice]);

  // Reset template when orientation changes
  useEffect(() => {

  }, [setValue]);


  // Handle file selection for specific slot
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && activeSlot) {
      // Validate file
      try {
        validateFile(file, 'PHOTO');
        
        // Create preview URL
        const preview = URL.createObjectURL(file);
        
        setTemplatePhotos(prev => ({
          ...prev,
          [activeSlot]: { file, preview }
        }));
        
        toast.success('Foto berhasil ditambahkan!');
      } catch (error) {
        toast.error(error.message);
      }
    }
    
    // Reset file input and active slot
    event.target.value = '';
    setActiveSlot(null);
  };

  // Trigger file input for specific slot
  const handleSlotClick = (slotNumber) => {
    setActiveSlot(slotNumber);
    fileInputRef.current?.click();
  };

  const removePhotoFromSlot = (slotIndex) => {
    setTemplatePhotos(prev => {
      const newPhotos = { ...prev };
      if (newPhotos[slotIndex]?.preview) {
        URL.revokeObjectURL(newPhotos[slotIndex].preview);
      }
      delete newPhotos[slotIndex];
      return newPhotos;
    });
  };


  // Fix generatePreview function - use 'preview' instead of 'url'
  const generatePreview = async () => {
    if (!selectedTemplate || Object.keys(templatePhotos).length === 0) return null;

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Fixed portrait dimensions
      const width = 1200;
      const height = 1800;
      
      canvas.width = width;
      canvas.height = height;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      const { layout, gridCols, gridRows } = selectedTemplate;
      
      // Add padding between cells
      const padding = 10;
      const cellWidth = (width - (padding * (gridCols + 1))) / gridCols;
      const cellHeight = (height - (padding * (gridRows + 1))) / gridRows;

      let loadedImages = 0;
      const totalImages = Object.keys(templatePhotos).length;

      // Load and draw each image
      Object.entries(templatePhotos).forEach(([slot, photo]) => {
        const img = new window.Image();
        img.onload = () => {
          const slotNum = parseInt(slot);
          
          // Find position in grid
          let row = 0, col = 0;
          for (let r = 0; r < layout.length; r++) {
            for (let c = 0; c < layout[r].length; c++) {
              if (layout[r][c] === slotNum) {
                row = r;
                col = c;
                break;
              }
            }
          }

          // Calculate cell position with padding
          const x = padding + (col * (cellWidth + padding));
          const y = padding + (row * (cellHeight + padding));

          // Save canvas state for clipping
          ctx.save();
          
          // Create clipping path for this cell
          ctx.beginPath();
          ctx.rect(x, y, cellWidth, cellHeight);
          ctx.clip();

          // Calculate object-cover dimensions
          const imgAspect = img.width / img.height;
          const cellAspect = cellWidth / cellHeight;

          let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

          if (imgAspect > cellAspect) {
            // Image is wider - fit height, center horizontally
            drawHeight = cellHeight;
            drawWidth = drawHeight * imgAspect;
            offsetX = (cellWidth - drawWidth) / 2;
          } else {
            // Image is taller - fit width, center vertically
            drawWidth = cellWidth;
            drawHeight = drawWidth / imgAspect;
            offsetY = (cellHeight - drawHeight) / 2;
          }

          // Draw image with object-cover effect (will be clipped to cell bounds)
          ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);

          // Restore canvas state (removes clipping)
          ctx.restore();

          loadedImages++;
          if (loadedImages === totalImages) {
            resolve(canvas.toDataURL('image/jpeg', 0.9));
          }
        };
        
        img.onerror = () => {
          console.error('Failed to load image:', photo.preview);
          loadedImages++;
          if (loadedImages === totalImages) {
            resolve(canvas.toDataURL('image/jpeg', 0.9));
          }
        };
        
        img.src = photo.preview;
      });
    });
  };

  const handleContinueToUpload = () => {
    if (!selectedTemplate) {
      toast.error('Pilih template terlebih dahulu');
      return;
    }
    setCurrentStep('upload');
  };

  const handlePreview = async () => {
    // Check if we have the required photos for the selected template
    const requiredSlots = selectedTemplate?.slots || 0;
    const uploadedPhotos = Object.keys(templatePhotos).length;
    
    if (uploadedPhotos === 0) {
      toast.error('Tambahkan minimal satu foto');
      return;
    }
    
    if (uploadedPhotos < requiredSlots) {
      toast.error(`Upload ${requiredSlots} foto untuk template ${selectedTemplate?.name}`);
      return;
    }
    
    try {
      // Show loading state
      const loadingToast = toast.loading('Membuat preview...');
      
      const previewDataUrl = await generatePreview();
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      if (previewDataUrl) {
        setPreviewCanvas(previewDataUrl);
        setCurrentStep('preview');
        toast.success('Preview berhasil dibuat!');
      } else {
        toast.error('Gagal membuat preview');
      }
    } catch (error) {
      toast.error('Gagal membuat preview');
      console.error('Preview generation error:', error);
    }
  };

  const handleRefreshPreview = async () => {
    try {
      const loadingToast = toast.loading('Memperbarui preview...');
      const previewDataUrl = await generatePreview();
      
      toast.dismiss(loadingToast);
      
      if (previewDataUrl) {
        setPreviewCanvas(previewDataUrl);
        toast.success('Preview diperbarui!');
      } else {
        toast.error('Gagal memperbarui preview');
      }
    } catch (error) {
      toast.error('Gagal memperbarui preview');
      console.error('Preview refresh error:', error);
    }
  };

  // Fix onSubmit function - handle canvas data properly
  const onSubmit = async (data) => {
    if (!previewCanvas) {
      toast.error('Harap buat preview terlebih dahulu');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(0);

      // Convert canvas data URL to blob
      const response = await fetch(previewCanvas);
      const blob = await response.blob();
      
      // Create a file from canvas blob
      const previewFile = new File([blob], 'photo-template.jpg', {
        type: 'image/jpeg'
      });

      // Validate file
      try {
        validateFile(previewFile, 'PHOTO');
      } catch (validationError) {
        toast.error(`Validasi file gagal: ${validationError.message}`);
        return;
      }

      // Prepare form data for API
      const apiFormData = {
        file: previewFile,
        customer_phone: data.phoneNumber,
        print_type: 'PHOTO',
        total_price: totalPrice,
        photo_size: 'SIZE_4R',
        photo_quantity: 1,
        template_data: {
          orientation: 'portrait',
          template: data.template,
          photos_used: Object.keys(templatePhotos).length
        },
        description: `Print foto template ${selectedTemplate?.name} (portrait)`
      };

      // Validate form data
      try {
        const validationErrors = validateFormData(apiFormData);
        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join(', '));
        }
      } catch (validationError) {
        toast.error(`Validasi data gagal: ${validationError.message}`);
        return;
      }

      // Prepare FormData for upload
      const uploadData = new FormData();
      uploadData.append('file', apiFormData.file);
      uploadData.append('customer_phone', apiFormData.customer_phone);
      uploadData.append('print_type', apiFormData.print_type);
      uploadData.append('total_price', apiFormData.total_price.toString());
      uploadData.append('photo_size', apiFormData.photo_size);
      uploadData.append('photo_quantity', apiFormData.photo_quantity.toString());
      uploadData.append('template_data', JSON.stringify(apiFormData.template_data));
      uploadData.append('description', apiFormData.description);

      // Show progress
      toast.loading('Memproses pesanan...', { id: 'processing' });

      // Call API
      const result = await createJobAndInvoice(uploadData, setUploadProgress);

      // Dismiss loading toast
      toast.dismiss('processing');

      if (!result || !result.data) {
        throw new Error('Response dari server tidak valid');
      }

      // Store data for later use
      const orderData = {
        type: 'photos',
        files: [{ file: previewFile, preview: URL.createObjectURL(previewFile) }],
        photoSize: 'SIZE_4R',
        quantity: 1,
        phoneNumber: data.phoneNumber,
        totalPhotos: 1,
        totalPrice: totalPrice,
        templateData: apiFormData.template_data,
        printJob: result.data.printJob,
        payment: result.data.payment
      };

      setUploadedFiles([{ file: previewFile, preview: URL.createObjectURL(previewFile) }]);
      setCurrentOrder(orderData);

      // Store in localStorage as backup
      localStorage.setItem('printJob', JSON.stringify(result.data.printJob));
      localStorage.setItem('paymentData', JSON.stringify(result.data.payment));

      toast.success('Pesanan berhasil dibuat! Mengarahkan ke pembayaran...');

      // Redirect to Xendit payment
      setTimeout(() => {
        if (result.data.payment && result.data.payment.invoice_url) {
          window.location.href = result.data.payment.invoice_url;
        } else {
          toast.error('URL pembayaran tidak ditemukan');
        }
      }, 1500);

    } catch (error) {
      console.error('Submit error:', error);
      toast.dismiss('processing');
      
      // More specific error messages
      if (error.name === 'NetworkError' || error.message.includes('fetch')) {
        toast.error('Koneksi internet bermasalah. Silakan coba lagi.');
      } else if (error.message.includes('validation')) {
        toast.error(`Validasi gagal: ${error.message}`);
      } else if (error.message.includes('API')) {
        toast.error('Server sedang bermasalah. Silakan coba lagi nanti.');
      } else {
        toast.error(error.message || 'Terjadi kesalahan saat memproses pesanan');
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        <div className={`flex items-center space-x-2 ${currentStep === 'template' ? 'text-secondary' : currentStep === 'upload' || currentStep === 'preview' ? 'text-success' : 'text-base-content/50'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'template' ? 'bg-secondary text-white' : currentStep === 'upload' || currentStep === 'preview' ? 'bg-success text-white' : 'bg-base-300'}`}>
            1
          </div>
          <span className="font-medium">Pilih Template</span>
        </div>
        <ArrowRight className="w-4 h-4 text-base-content/50" />
        <div className={`flex items-center space-x-2 ${currentStep === 'upload' ? 'text-secondary' : currentStep === 'preview' ? 'text-success' : 'text-base-content/50'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'upload' ? 'bg-secondary text-white' : currentStep === 'preview' ? 'bg-success text-white' : 'bg-base-300'}`}>
            2
          </div>
          <span className="font-medium">Upload Foto</span>
        </div>
        <ArrowRight className="w-4 h-4 text-base-content/50" />
        <div className={`flex items-center space-x-2 ${currentStep === 'preview' ? 'text-secondary' : 'text-base-content/50'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'preview' ? 'bg-secondary text-white' : 'bg-base-300'}`}>
            3
          </div>
          <span className="font-medium">Preview & Pesan</span>
        </div>
      </div>
    </div>
  );

  const renderTemplateStep = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-base-content mb-4">Upload Foto Portrait</h1>
        <p className="text-base-content/70 text-lg">Pilih template dan upload foto Anda dalam format portrait</p>
      </div>

      {/* Template Selection */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-base-content mb-2">Pilih Template Portrait</h2>
            <p className="text-base-content/70">Pilih layout template seperti Instagram untuk foto portrait Anda</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {TEMPLATES.map((tmpl) => (
              <label
                key={tmpl.id}
                className={`cursor-pointer border-2 rounded-xl p-6 transition-all duration-300 hover:border-secondary hover:shadow-lg transform hover:-translate-y-1 ${template === tmpl.id ? 'border-secondary bg-secondary/10 shadow-lg ring-2 ring-secondary/20' : 'border-base-300'}`}
              >
                <input
                  type="radio"
                  value={tmpl.id}
                  className="radio radio-secondary sr-only"
                  {...register('template')}
                />
                <div className="text-center">
                  <div className="mb-4 mx-auto w-24 h-32 bg-base-200 rounded-lg flex items-center justify-center relative overflow-hidden">
                    <div 
                      className="grid gap-1 w-16 h-24"
                      style={{
                        gridTemplateColumns: `repeat(${tmpl.gridCols}, 1fr)`,
                        gridTemplateRows: `repeat(${tmpl.gridRows}, 1fr)`
                      }}
                    >
                      {Array.from({ length: tmpl.slots }).map((_, i) => (
                        <div key={i} className="bg-secondary/40 rounded-sm border border-secondary/20"></div>
                      ))}
                    </div>
                  </div>
                  <h3 className="font-semibold text-base-content mb-1">{tmpl.name}</h3>
                  <p className="text-sm text-base-content/60">{tmpl.slots} foto portrait</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex justify-center mt-8">
        <button
          type="button"
          onClick={handleContinueToUpload}
          className="btn btn-secondary btn-lg px-8 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
          disabled={!selectedTemplate}
        >
          Lanjut Upload Foto Portrait
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );

  const renderUploadStep = () => (
    <div className="space-y-8">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-base-content mb-2">
          Upload Foto ke Template: {selectedTemplate?.name}
        </h1>
        <p className="text-base-content/70">Klik pada kotak untuk upload foto portrait Anda</p>
      </div>

      {/* Template Grid */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-8">
          <div className="max-w-md mx-auto">
            <div 
              className="grid gap-3 aspect-[3/4] bg-base-200 rounded-xl p-6"
              style={{
                gridTemplateColumns: `repeat(${selectedTemplate?.gridCols || 1}, 1fr)`,
                gridTemplateRows: `repeat(${selectedTemplate?.gridRows || 1}, 1fr)`
              }}
            >
              {Array.from({ length: selectedTemplate?.slots || 1 }, (_, index) => {
                const slotIndex = index + 1;
                const photo = templatePhotos[slotIndex];
                
                return (
                  <div
                    key={slotIndex}
                    className={`
                      relative aspect-[3/4] rounded-lg border-2 border-dashed transition-all duration-300 cursor-pointer
                      ${photo 
                        ? 'border-secondary bg-secondary/10 hover:border-secondary/80' 
                        : 'border-base-300 bg-base-100 hover:border-secondary hover:bg-secondary/5'
                      }
                    `}
                    onClick={() => handleSlotClick(slotIndex)}
                  >
                    {photo ? (
                      <>
                        <img
                          src={photo.preview}
                          alt={`Foto ${slotIndex}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-300 rounded-lg flex items-center justify-center">
                          <div className="opacity-0 hover:opacity-100 transition-opacity duration-300">
                            <Camera className="w-8 h-8 text-white drop-shadow-lg" />
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePhoto(slotIndex);
                          }}
                          className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error shadow-lg hover:shadow-xl"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                            {truncateFileName(photo.file.name, 20)}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-base-content/60">
                        <Upload className="w-8 h-8 mb-2" />
                        <span className="text-sm font-medium">Foto {slotIndex}</span>
                        <span className="text-xs">Klik untuk upload</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-base-content/70 mb-2">
              <span>Progress Upload</span>
              <span>{Object.keys(templatePhotos).length}/{selectedTemplate?.slots} foto</span>
            </div>
            <div className="w-full bg-base-300 rounded-full h-2">
              <div
                className="bg-secondary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(Object.keys(templatePhotos).length / (selectedTemplate?.slots || 1)) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={handlePreview}
              disabled={Object.keys(templatePhotos).length === 0}
              className={`
                btn btn-lg px-8 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300
                ${Object.keys(templatePhotos).length === selectedTemplate?.slots 
                  ? 'btn-secondary' 
                  : 'btn-outline btn-secondary'
                }
              `}
            >
              {Object.keys(templatePhotos).length === selectedTemplate?.slots 
                ? 'Lihat Preview' 
                : `Upload ${(selectedTemplate?.slots || 1) - Object.keys(templatePhotos).length} foto lagi`
              }
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setCurrentStep('template')}
          className="btn btn-outline"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Ganti Template
        </button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Preview Display */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-base-content mb-2">
              Template: {selectedTemplate?.name}
            </h2>
            <p className="text-base-content/70">Format: Portrait (3:4)</p>
          </div>
          
          <div className="flex justify-center">
            {previewCanvas ? (
              <div className="max-w-sm mx-auto">
                <img
                  src={previewCanvas}
                  alt="Preview"
                  className="w-full rounded-lg shadow-lg border border-base-300"
                />
              </div>
            ) : (
              <div className="max-w-sm mx-auto aspect-[3/4] bg-base-200 rounded-lg flex items-center justify-center">
                <div className="text-center text-base-content/60">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                  <p>Preview sedang dimuat...</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-6">
            <button
              type="button"
              onClick={() => setCurrentStep('upload')}
              className="btn btn-outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Edit Foto
            </button>
            <button
              type="button"
              onClick={handleRefreshPreview}
              className="btn btn-secondary"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh Preview
            </button>
          </div>
        </div>
      </div>

      {/* Phone Number */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body">
          <h2 className="card-title mb-4">Informasi Kontak</h2>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/60" />
            <input
              type="tel"
              placeholder="08123456789"
              className={`input input-bordered w-full pl-10 ${errors.phoneNumber ? 'input-error' : ''}`}
              {...register('phoneNumber')}
            />
          </div>
          {errors.phoneNumber && (
            <div className="label">
              <span className="label-text-alt text-error">{errors.phoneNumber.message}</span>
            </div>
          )}
          <div className="label">
            <span className="label-text-alt">Nomor ini akan digunakan untuk notifikasi status cetak</span>
          </div>
        </div>
      </div>

      {/* Price Summary */}
      <div className="card bg-secondary text-white shadow-xl">
        <div className="card-body">
          <div className="flex items-center space-x-3 mb-4">
            <Calculator className="w-6 h-6" />
            <h2 className="card-title">Ringkasan Harga</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Cetak Foto Portrait 4R</span>
              <span>1x</span>
            </div>
            <div className="flex justify-between">
              <span>Template: {selectedTemplate?.name}</span>
              <span>{selectedTemplate?.slots} foto</span>
            </div>
            <div className="divider my-2"></div>
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>Rp {totalPrice.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isSubmitting || !isValid || !previewCanvas}
          className="btn btn-secondary btn-lg px-8 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm mr-2"></span>
              Memproses...
            </>
          ) : (
            <>
              Cetak Sekarang
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </button>
      </div>

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-base-content/50 text-center">
          Debug: isValid={isValid.toString()}, previewCanvas={!!previewCanvas}, isSubmitting={isSubmitting.toString()}
        </div>
      )}
    </form>
  );

  return (
    <div className="min-h-screen bg-base-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-base-content mb-2">
                Cetak Foto Template
              </h1>
              <p className="text-base-content/70">
                Pilih template, lalu klik pada posisi template untuk upload foto
              </p>
            </div>
            <Link to="/pilih-jenis" className="btn btn-ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ganti Jenis
            </Link>
          </div>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Step Content */}
          {currentStep === 'template' && renderTemplateStep()}
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'preview' && renderPreviewStep()}
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload;