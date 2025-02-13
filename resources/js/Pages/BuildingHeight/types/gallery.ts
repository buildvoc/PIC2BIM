export interface GalleryImage {
  id: number;
  gallery_id: string;
  filename: string;
  resized_filename: string;
  thumbnail_filename: string;
  description: string;
  long_description: string;
  created_at: string;
  exif_data_latitude: string;
  exif_data_longitude: string;
  exif_data_altitude: string;
  exif_data_make: string;
  exif_data_model: string;
  exif_data_exposure: string;
  exif_data_aperture: string;
  exif_data_focal_length: string;
  exif_data_iso: string;
  exif_data_taken_at: string;
  exif_data_gps_img_direction: string;
  weather_description: null;
  weather_temperature: null;
  weather_humidity: null;
  weather_pressure: null;
  weather_wind_speed: null;
  exif_data_gps_longitude_ref: string;
  exif_data_gps_latitude_ref: string;
  exif_data_focal_length_in35mm_film: string;
  photo:string;
}

export interface Gallery {
  success: boolean;
  http_code: number;
  data: {
    images: {
      data: GalleryImage[];
    };
  };
}
