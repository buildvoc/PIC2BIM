<?php

namespace App\Console\Commands;

use App\Models\Photo;
use Illuminate\Console\Command;

class PomLocateByNmea extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:pom-locate-by-nmea';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'POM locate by nmea';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $photos = Photo::
            select('id', 'nmea_msg', 'lat', 'lng')
            ->whereNull('flg_checked_location')
            ->where('device_platform', 'Android')
            ->limit(2000)
            ->get();
            
        foreach ($photos as $photo) {
            $photoId = $photo->id;
            $nmeaMsg = $photo->nmea_msg;
            $lat = $photo->lat;
            $lng = $photo->lng;

            $nmeaLocation = get_coordinates_from_nmea($nmeaMsg);
            
            if ($nmeaLocation) {
                $nmeaLocationJson = json_encode($nmeaLocation);
                $distance = get_distance_from_coordinates($lat, $lng, $nmeaLocation['lat'], $nmeaLocation['lon']);
                $checkLocation = $distance < 50 ? 1 : 0;

                Photo::
                    where('id', $photoId)
                    ->update([
                        'nmea_location' => $nmeaLocationJson,
                        'nmea_distance' => $distance,
                        'flg_checked_location' => $checkLocation,
                    ]);
            } else {
                Photo::
                    where('id', $photoId)
                    ->update(['flg_checked_location' => 0]);
            }
        }

    }
}
