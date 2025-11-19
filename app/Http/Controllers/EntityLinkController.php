<?php

namespace App\Http\Controllers;

use App\Models\EntityLink;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class EntityLinkController extends Controller
{
    public function upsert(Request $request): JsonResponse
    {
        Log::info('EntityLinkController@upsert: incoming request', ['payload' => $request->all()]);
        try {
            $data = $this->validatePayload($request);

            $link = EntityLink::updateOrCreate(
                [
                    'src_type' => $data['src_type'],
                    'src_id' => $data['src_id'],
                    'relation' => $data['relation'],
                    'dst_type' => $data['dst_type'],
                    'dst_id' => $data['dst_id'],
                ],
                [
                    'status' => $data['status'],
                    'source' => $data['source'] ?? 'auto_bearing',
                    'confidence' => $data['confidence'] ?? null,
                    'bearing_delta' => $data['bearing_delta'] ?? null,
                    'distance_m' => $data['distance_m'] ?? null,
                    'note' => $data['note'] ?? null,
                    'created_by' => $data['created_by'] ?? Auth::id(),
                    'verified_by' => $data['status'] === 'verified' ? (Auth::id() ?? $data['verified_by'] ?? null) : null,
                ]
            );

            Log::info('EntityLinkController@upsert: upserted', ['link' => $link->toArray()]);
            return response()->json(['data' => $link], 200);
        } catch (\Throwable $e) {
            Log::error('EntityLinkController@upsert: exception', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Server error'], 500);
        }
    }

    public function delete(Request $request): JsonResponse
    {
        // Delete by composite key
        $validator = Validator::make($request->all(), [
            'src_type' => 'required|string|max:32',
            'src_id' => 'required|string|max:128',
            'relation' => 'required|string|max:64',
            'dst_type' => 'required|string|max:32',
            'dst_id' => 'required|string|max:128',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation error', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        Log::info('EntityLinkController@delete: incoming request', ['payload' => $data]);

        try {
            $deleted = EntityLink::where('src_type', $data['src_type'])
                ->where('src_id', $data['src_id'])
                ->where('relation', $data['relation'])
                ->where('dst_type', $data['dst_type'])
                ->where('dst_id', $data['dst_id'])
                ->delete();

            Log::info('EntityLinkController@delete: deleted', ['deleted' => $deleted]);
            return response()->json(['deleted' => $deleted], 200);
        } catch (\Throwable $e) {
            Log::error('EntityLinkController@delete: exception', ['message' => $e->getMessage()]);
            return response()->json(['message' => 'Server error'], 500);
        }
    }

    public function statuses(Request $request): JsonResponse
    {
        // Expect: src_type, src_id, relation, items: [{dst_type, dst_id}]
        $validator = Validator::make($request->all(), [
            'src_type' => 'required|string|max:32',
            'src_id' => 'required|string|max:128',
            'relation' => 'required|string|max:64',
            'items' => 'required|array|min:1',
            'items.*.dst_type' => 'required|string|max:32',
            'items.*.dst_id' => 'required|string|max:128',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation error', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        Log::info('EntityLinkController@statuses: incoming request', ['payload' => $data]);

        try {
            $srcType = $data['src_type'];
            $srcId = $data['src_id'];
            $relation = $data['relation'];
            $items = $data['items'];

            // Fetch all links for the src+relation, then filter in PHP (keeps query simple)
            $links = EntityLink::where('src_type', $srcType)
                ->where('src_id', $srcId)
                ->where('relation', $relation)
                ->get(['dst_type', 'dst_id', 'status']);

            // Build set of requested pairs
            $requested = [];
            foreach ($items as $it) {
                $requested[strtolower($it['dst_type']).'|'.$it['dst_id']] = true;
            }

            $results = [];
            foreach ($links as $link) {
                $key = strtolower($link->dst_type).'|'.$link->dst_id;
                if (isset($requested[$key])) {
                    $results[] = [
                        'dst_type' => $link->dst_type,
                        'dst_id' => $link->dst_id,
                        'status' => $link->status,
                    ];
                }
            }

            Log::info('EntityLinkController@statuses: returning', ['count' => count($results)]);
            return response()->json(['data' => $results], 200);
        } catch (\Throwable $e) {
            Log::error('EntityLinkController@statuses: exception', ['message' => $e->getMessage()]);
            return response()->json(['message' => 'Server error'], 500);
        }
    }

    public function bulkUpsert(Request $request): JsonResponse
    {
        Log::info('EntityLinkController@bulkUpsert: incoming request', ['payload' => $request->all()]);
        $items = $request->input('items');
        if (!is_array($items)) {
            return response()->json(['message' => 'Invalid payload. items must be an array'], 422);
        }

        try {
            $results = [];
            foreach ($items as $item) {
                $validated = $this->validateArray($item);
                if ($validated instanceof JsonResponse) {
                    Log::warning('EntityLinkController@bulkUpsert: validation error', ['errors' => $validated->getData(true)]);
                    return $validated; // early return on first error
                }

                $link = EntityLink::updateOrCreate(
                    [
                        'src_type' => $validated['src_type'],
                        'src_id' => $validated['src_id'],
                        'relation' => $validated['relation'],
                        'dst_type' => $validated['dst_type'],
                        'dst_id' => $validated['dst_id'],
                    ],
                    [
                        'status' => $validated['status'],
                        'source' => $validated['source'] ?? 'auto_bearing',
                        'confidence' => $validated['confidence'] ?? null,
                        'bearing_delta' => $validated['bearing_delta'] ?? null,
                        'distance_m' => $validated['distance_m'] ?? null,
                        'note' => $validated['note'] ?? null,
                        'created_by' => $validated['created_by'] ?? Auth::id(),
                        'verified_by' => $validated['status'] === 'verified' ? (Auth::id() ?? $validated['verified_by'] ?? null) : null,
                    ]
                );
                $results[] = $link;
            }
            Log::info('EntityLinkController@bulkUpsert: upserted', ['count' => count($results)]);
            return response()->json(['data' => $results], 200);
        } catch (\Throwable $e) {
            Log::error('EntityLinkController@bulkUpsert: exception', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Server error'], 500);
        }
    }

    private function validatePayload(Request $request): array
    {
        $validator = Validator::make($request->all(), [
            'src_type' => 'required|string|max:32',
            'src_id' => 'required|string|max:128',
            'relation' => 'required|string|max:64',
            'dst_type' => 'required|string|max:32',
            'dst_id' => 'required|string|max:128',
            'status' => 'required|in:verified,rejected',
            'source' => 'nullable|string|max:32',
            'confidence' => 'nullable|numeric',
            'bearing_delta' => 'nullable|numeric',
            'distance_m' => 'nullable|numeric',
            'note' => 'nullable|string',
            'created_by' => 'nullable|integer',
            'verified_by' => 'nullable|integer',
        ]);

        $validator->validate();
        return $validator->validated();
    }

    private function validateArray(array $data)
    {
        $validator = Validator::make($data, [
            'src_type' => 'required|string|max:32',
            'src_id' => 'required|string|max:128',
            'relation' => 'required|string|max:64',
            'dst_type' => 'required|string|max:32',
            'dst_id' => 'required|string|max:128',
            'status' => 'required|in:verified,rejected',
            'source' => 'nullable|string|max:32',
            'confidence' => 'nullable|numeric',
            'bearing_delta' => 'nullable|numeric',
            'distance_m' => 'nullable|numeric',
            'note' => 'nullable|string',
            'created_by' => 'nullable|integer',
            'verified_by' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation error', 'errors' => $validator->errors()], 422);
        }
        return $validator->validated();
    }
}
