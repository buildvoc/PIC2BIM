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
 * @OA\Tag(
 *     name="Authorization",
 *     description="Authentication endpoints"
 * )
 * @OA\Tag(
 *     name="Photos",
 *     description="Photo management endpoints"
 * )
 * @OA\Tag(
 *     name="BuiltupArea",
 *     description="Built-up area data endpoints"
 * )
 * @OA\Tag(
 *     name="Area",
 *     description="Area and building data endpoints"
 * )
 * @OA\Tag(
 *     name="Tasks",
 *     description="Task management endpoints"
 * )
 * @OA\Tag(
 *     name="Paths",
 *     description="Path tracking endpoints"
 * )
 * @OA\Tag(
 *     name="Shapes",
 *     description="Shape data endpoints"
 * )
 * @OA\Tag(
 *     name="LPIS",
 *     description="LPIS data endpoints"
 * )
 * @OA\Tag(
 *     name="Building Part",
 *     description="Building part data endpoints"
 * )
 * @OA\Tag(
 *     name="OSM Building Part",
 *     description="OSM building part data endpoints"
 * )
 * @OA\Tag(
 *     name="Codepoint",
 *     description="Codepoint data endpoints"
 * )
 * @OA\Tag(
 *     name="UPRN",
 *     description="UPRN address endpoints"
 * )
 * @OA\Tag(
 *     name="NHLE",
 *     description="NHLE data endpoints"
 * )
 * @OA\Tag(
 *     name="Land Registry",
 *     description="Land registry data endpoints"
 * )
 * @OA\Tag(
 *     name="Building Attributes",
 *     description="Building attributes endpoints"
 * )
 */

abstract class Controller
{
    //
}
