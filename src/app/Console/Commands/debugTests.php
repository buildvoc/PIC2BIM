<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class debugTests extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:debug-tests';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        try {
            Storage::disk('public')->put('photos4all/7/3/debug_file.txt', 'Debug content');
        } catch (\Exception $e) {
            Log::error('Exception in Storage::disk public: ' . $e->getMessage());
        }
    }
}
