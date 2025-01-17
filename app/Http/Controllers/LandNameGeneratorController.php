<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class LandNameGeneratorController extends Controller
{
    public function index(Request $request)
    {
        if ($request->has('land')) {
            $text = $request->input('land');
            $textLength = strlen($text);
            $zoom = $request->input('zoom', 12);

            if ($zoom == 15) {
                $fontSize = 8;
            } elseif ($zoom > 15 && $zoom < 18) {
                $fontSize = 10;
            } else {
                $fontSize = 12;
            }

            $textHeight = $fontSize * 1.25;

            // create image handle
            $image = ImageCreate($textLength*($textHeight-($fontSize/2)),$textHeight*1.3);

            // set colours
            $backgroundColour = imagecolorallocatealpha($image,255,255,255,0); // transparent
            isset($_GET['color'])?$fontColors=explode("|", $_GET['color']):$fontColors=array(120,120,120);
            $textColour = ImageColorAllocate($image,$fontColors[0],$fontColors[1],$fontColors[2]);

            $font = public_path("/fonts/arial.ttf");
            // set text
            imagettftext($image, $fontSize, 0, 0, $textHeight, $textColour, $font, $text);

            return response()->stream(function () use ($image) {
                echo ImagePNG($image);
            }, 200, [
                'Content-Type' => 'image/png',
                'Content-Disposition' => 'inline; filename="landname.png"',
            ]);
        }

        return response()->json(['error' => 'Invalid parameters'], 400);
    }
}