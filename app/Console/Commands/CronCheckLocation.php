<?php

namespace App\Console\Commands;

use App\Models\Photo;
use Illuminate\Console\Command;

class CronCheckLocation extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:cron-check-location';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check photo location';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        Photo::
            whereNull('flg_checked_location')
            ->where(function ($query) {
                $query->whereNull('network_info')
                    ->orWhereNotNull('network_location');
            })
            ->where('nmea_distance', '<=', 50)
            ->where('distance', '<=', 5000)
            ->update(['flg_checked_location' => 1]);

        Photo::
            whereNull('flg_checked_location')
            ->where(function ($query) {
                $query->whereNull('network_info')
                    ->orWhereNotNull('network_location');
            })
            ->update(['flg_checked_location' => 0]);
    }
}
