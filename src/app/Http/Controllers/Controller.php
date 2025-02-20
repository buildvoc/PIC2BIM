<?php

namespace App\Http\Controllers;

/**
 * @OA\Info(
 *    title="PIC2BIM API Documentation",
 *    version="1.0.0",
 * )
 * @OA\SecurityScheme(
 *     type="http",
 *     description="Login to get the authentication token",
 *     name="Token based Based",
 *     in="header",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     securityScheme="bearerAuth",
 * )
 */

abstract class Controller
{
    //
}
