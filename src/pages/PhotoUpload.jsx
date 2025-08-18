import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Image, Calculator, Phone, ArrowRight, ArrowLeft, Plus, Minus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePricing } from '../hooks/usePricing';
import { useStore } from '../store/useStore';
import { createJobAndInvoice, validateFile, validateFormData } from '../lib/api';
import FileUpload from '../components/FileUpload';
import toast from 'react-hot-toast';

const photoSchema = z.object({
  phoneNumber: z.string()
    .min(10, 'Nomor telepon minimal 10 digit')
    .max(15, 'Nomor telepon maksimal 15 digit')
    .regex(/^[0-9+]+$/, 'Nomor telepon hanya boleh berisi angka dan tanda +'),
  photoSize: z.string({
    required_error: 'Pilih ukuran foto'
  }),
  quantity: z.number()
    .min(1, 'Jumlah minimal 1')
    .max(2, 'Jumlah maksimal 2') // Updated max to 2 for 2R photos
});

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
  const [files, setFiles] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { getPhotoPricingDisplay } = usePricing();
  const { setUploadedFiles, setCurrentOrder } = useStore();
  
  const pricingData = getPhotoPricingDisplay();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm({
    resolver: zodResolver(photoSchema),
    defaultValues: {
      quantity: 1,
      photoSize: pricingData?.sizes?.[0]?.size || 'SIZE_2R'
    }
  });

  const photoSize = watch('photoSize');
  const quantity = watch('quantity');

  // Calculate total price when files, size, or quantity changes
  useEffect(() => {
    if (pricingData && files.length > 0 && photoSize && quantity) {
      const sizeData = pricingData.sizes.find(s => s.size === photoSize.replace('SIZE_', ''));
      if (sizeData) {
        const totalPhotos = files.length * quantity;
        setTotalPrice(totalPhotos * sizeData.price);
      }
    } else {
      setTotalPrice(0);
    }
  }, [files, photoSize, quantity, pricingData]);

  const onSubmit = async (data) => {
    if (files.length === 0) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(0);

      // Validate file
      validateFile(files[0].file, 'PHOTO');

      // Prepare form data for API
      const apiFormData = {
        file: files[0].file,
        customer_phone: data.phoneNumber,
        print_type: 'PHOTO',
        total_price: totalPrice,
        photo_size: data.photoSize,
        photo_quantity: data.quantity,
        description: `Print foto ${files[0].file.name}`
      };

      // Validate form data
      const validationErrors = validateFormData(apiFormData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      // Prepare FormData for upload
      const uploadData = new FormData();
      uploadData.append('file', apiFormData.file);
      uploadData.append('customer_phone', apiFormData.customer_phone);
      uploadData.append('print_type', apiFormData.print_type);
      uploadData.append('total_price', apiFormData.total_price.toString());
      uploadData.append('photo_size', apiFormData.photo_size);
      uploadData.append('photo_quantity', apiFormData.photo_quantity.toString());
      uploadData.append('description', apiFormData.description);

      // Call API
      const result = await createJobAndInvoice(uploadData, setUploadProgress);

      // Store data for later use
      const orderData = {
        type: 'photos',
        files: files,
        photoSize: data.photoSize,
        quantity: data.quantity,
        phoneNumber: data.phoneNumber,
        totalPhotos: files.length * data.quantity,
        totalPrice: totalPrice,
        printJob: result.data.printJob,
        payment: result.data.payment
      };

      setUploadedFiles(files);
      setCurrentOrder(orderData);

      // Store in localStorage as backup
      localStorage.setItem('printJob', JSON.stringify(result.data.printJob));
      localStorage.setItem('paymentData', JSON.stringify(result.data.payment));

      toast.success('Pesanan berhasil dibuat! Mengarahkan ke pembayaran...');

      // Redirect to Xendit payment
      setTimeout(() => {
        window.location.href = result.data.payment.invoice_url;
      }, 1000);

    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Terjadi kesalahan saat memproses pesanan');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const adjustQuantity = (delta) => {
    const currentQuantity = quantity || 1;
    const currentSize = photoSize?.replace('SIZE_', '') || '2R';
    
    // Determine max quantity based on photo size
    const maxQuantity = currentSize === '2R' ? 2 : 1;
    
    const newQuantity = Math.max(1, Math.min(maxQuantity, currentQuantity + delta));
    setValue('quantity', newQuantity);
  };

  const acceptedFileTypes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png']
  };

  function getSizeDescription(size) {
    const descriptions = {
      '2R': '6x9 cm',
      '3R': '9x13 cm', 
      '4R': '10x15 cm',
      '5R': '13x18 cm',
      '6R': '15x20 cm'
    };
    return descriptions[size] || '';
  }

  // Fungsi untuk menghitung berapa foto yang bisa dicetak dalam 1 kertas foto
  function getPhotosPerPaper(size) {
    // Menggunakan kertas foto standar 4R (10x15 cm) sebagai acuan
    const paperWidth = 10; // cm
    const paperHeight = 15; // cm
    
    const photoSizes = {
      '2R': { width: 6, height: 9 },   // 6x9 cm
      '3R': { width: 9, height: 13 },  // 9x13 cm
      '4R': { width: 10, height: 15 }, // 10x15 cm
      '5R': { width: 13, height: 18 }, // 13x18 cm
      '6R': { width: 15, height: 20 }  // 15x20 cm
    };
    
    const photoSize = photoSizes[size];
    if (!photoSize) return 1;
    
    // Untuk ukuran yang lebih besar dari kertas, return 1
    if (photoSize.width > paperWidth || photoSize.height > paperHeight) {
      return 1;
    }
    
    // Hitung berapa foto yang bisa muat secara horizontal dan vertikal
    const horizontalFit = Math.floor(paperWidth / photoSize.width);
    const verticalFit = Math.floor(paperHeight / photoSize.height);
    
    // Coba juga orientasi terbalik (landscape)
    const horizontalFitRotated = Math.floor(paperWidth / photoSize.height);
    const verticalFitRotated = Math.floor(paperHeight / photoSize.width);
    
    // Ambil yang memberikan hasil maksimal
    const normalLayout = horizontalFit * verticalFit;
    const rotatedLayout = horizontalFitRotated * verticalFitRotated;
    
    return Math.max(normalLayout, rotatedLayout, 1);
  }

  const photoSizeOptions = pricingData?.sizes?.map(size => ({
    value: `SIZE_${size.size}`,
    label: size.size,
    price: size.price,
    description: getSizeDescription(size.size),
    photosPerPaper: getPhotosPerPaper(size.size)
  })) || [];

  return (
    <div className="min-h-screen bg-base-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-base-content mb-2">
                Upload Foto
              </h1>
              <p className="text-base-content/70">
                Upload satu foto dan pilih ukuran cetak yang diinginkan
              </p>
            </div>
            <Link to="/pilih-jenis" className="btn btn-ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ganti Jenis
            </Link>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* File Upload Section */}
            <div className="card bg-base-100 shadow-xl border border-base-200">
              <div className="card-body">
                <div className="flex items-center space-x-3 mb-4">
                  <Image className="w-6 h-6 text-secondary" />
                  <h2 className="card-title">Upload Foto</h2>
                </div>
                
                <FileUpload
                  files={files}
                  onFilesChange={setFiles}
                  acceptedFileTypes={acceptedFileTypes}
                  maxFiles={1}
                  fileType="photo"
                />
              </div>
            </div>

            {/* Configuration Section */}
            {files.length > 0 && (
              <div className="card bg-base-100 shadow-xl border border-base-200">
                <div className="card-body">
                  <h2 className="card-title mb-4">Pengaturan Cetak</h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Photo Size Selection */}
                    <div className="md:col-span-2">
                      <label className="label">
                        <span className="label-text font-semibold">Ukuran Foto</span>
                      </label>
                      
                      {/* Orientation Info */}
                      <div className="bg-info/10 border border-info/20 rounded-lg p-4 mb-4">
                        <div className="flex items-start space-x-2">
                          <div className="text-info mt-0.5">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="text-sm text-base-content">
                            <div className="font-semibold mb-2">Informasi Orientasi Foto:</div>
                            <ul className="space-y-1 text-xs">
                              <li><strong>2R - 4R:</strong> Sistem akan otomatis mendeteksi orientasi foto (landscape/portrait) dan menyesuaikan layout cetak</li>
                              <li><strong>5R - 6R:</strong> Hanya mendukung orientasi portrait. Pastikan foto Anda memiliki dimensi portrait (tinggi &gt; lebar)</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {photoSizeOptions.map((option) => {
                          const isLargeSize = ['5R', '6R'].includes(option.label);
                          return (
                            <label
                              key={option.value}
                              className={`cursor-pointer border-2 rounded-lg p-4 transition-all hover:border-secondary ${
                                photoSize === option.value 
                                  ? 'border-secondary bg-secondary/10' 
                                  : 'border-base-300'
                              }`}
                            >
                              <input
                                type="radio"
                                value={option.value}
                                className="radio radio-secondary sr-only"
                                {...register('photoSize')}
                              />
                              <div className="text-center">
                                <div className="font-semibold text-lg mb-1">
                                  {option.label}
                                  {isLargeSize && (
                                    <span className="ml-2 text-xs bg-warning/20 text-warning px-2 py-1 rounded-full">
                                      Portrait Only
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-base-content/70 mb-2">
                                  {option.description}
                                </div>
                                <div className="text-xs text-info mb-2">
                                  Bisa print {option.photosPerPaper} foto dalam 1 kertas
                                </div>
                                {isLargeSize && (
                                  <div className="text-xs text-warning mb-2">
                                    📐 Foto harus portrait (tinggi &gt; lebar)
                                  </div>
                                )}
                                <div className="text-secondary font-bold">
                                  Rp {option.price.toLocaleString('id-ID')}
                                </div>
                              </div>
                              {photoSize === option.value && (
                                <div className="flex justify-center mt-2">
                                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                                </div>
                              )}
                            </label>
                          );
                        })}
                      </div>
                      {errors.photoSize && (
                        <div className="label">
                          <span className="label-text-alt text-error">{errors.photoSize.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Quantity Input */}
                    <div className="md:col-span-2">
                      <label className="label">
                        <span className="label-text font-semibold">Jumlah Cetak</span>
                      </label>
                      <div className="flex items-center justify-center space-x-4">
                        <button
                          type="button"
                          onClick={() => adjustQuantity(-1)}
                          className="btn btn-outline btn-lg"
                          disabled={quantity <= 1}
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        
                        <div className="text-center">
                          <input
                            type="number"
                            min="1"
                            max={photoSize?.replace('SIZE_', '') === '2R' ? "2" : "1"}
                            className={`input input-bordered w-24 text-center text-xl font-bold ${
                              errors.quantity ? 'input-error' : ''
                            }`}
                            {...register('quantity', { valueAsNumber: true })}
                          />
                          <div className="text-sm text-base-content/70 mt-1">
                            foto
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => adjustQuantity(1)}
                          className="btn btn-outline btn-lg"
                          disabled={quantity >= (photoSize?.replace('SIZE_', '') === '2R' ? 2 : 1)}
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      {errors.quantity && (
                        <div className="label">
                          <span className="label-text-alt text-error">{errors.quantity.message}</span>
                        </div>
                      )}
                      <div className="text-center mt-2">
                        <span className="text-sm text-base-content/70">
                          {photoSize?.replace('SIZE_', '') === '2R' 
                            ? `Foto akan dicetak sebanyak ${quantity} kali (maksimal 2 foto dalam 1 kertas)`
                            : `Foto akan dicetak sebanyak ${quantity} kali (1 foto per kertas)`
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Phone Number Input */}
                  <div className="mt-6">
                    <label className="label">
                      <span className="label-text font-semibold">Nomor Telepon</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/60" />
                      <input
                        type="tel"
                        placeholder="08123456789"
                        className={`input input-bordered w-full pl-10 ${
                          errors.phoneNumber ? 'input-error' : ''
                        }`}
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
              </div>
            )}

            {/* Price Calculator */}
            {files.length > 0 && photoSize && (
              <div className="card bg-secondary text-white shadow-xl">
                <div className="card-body">
                  <div className="flex items-center space-x-3 mb-4">
                    <Calculator className="w-6 h-6" />
                    <h2 className="card-title">Ringkasan Harga</h2>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>File:</span>
                      <span className="font-semibold truncate ml-2" title={files[0]?.file?.name || ''}>
                        {files.length > 0 && files[0]?.file?.name ? truncateFileName(files[0].file.name) : 'Tidak ada file'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Ukuran:</span>
                      <span className="font-semibold">
                        {photoSize.replace('SIZE_', '')} ({getSizeDescription(photoSize.replace('SIZE_', ''))})
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Jumlah Cetak:</span>
                      <span className="font-semibold">{quantity} foto</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Harga per Foto:</span>
                      <span className="font-semibold">
                        Rp {pricingData?.sizes?.find(s => s.size === photoSize.replace('SIZE_', ''))?.price?.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="divider"></div>
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-bold">Total Harga:</span>
                      <span className="font-bold text-2xl">
                        Rp {totalPrice.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isSubmitting && uploadProgress > 0 && (
              <div className="card bg-base-100 shadow-xl border border-base-200">
                <div className="card-body">
                  <h3 className="font-semibold mb-2">Mengunggah file...</h3>
                  <progress className="progress progress-secondary w-full" value={uploadProgress} max="100"></progress>
                  <div className="text-center text-sm text-base-content/70">
                    {uploadProgress}% selesai
                  </div>
                </div>
              </div>
            )}

            {/* Continue Button */}
            {files.length > 0 && (
              <div className="text-center">
                <button
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  className="btn btn-secondary btn-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm mr-2"></span>
                      Memproses...
                    </>
                  ) : (
                    <>
                      Lanjutkan ke Pembayaran
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload;