import React from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import type { Props } from './types';

import BuildingAttributesContent from './BuildingAttributesContent';

const Index: React.FC<Props> = ({ auth, photos }) => {
  return (
    <>
      <Head title="Building Attributes" />
      <AuthenticatedLayout user={auth.user}>
        <BuildingAttributesContent photos={photos} />
      </AuthenticatedLayout>
    </>
  );
};


export default Index;

// Add TypeScript declarations for the global window object
declare global {
  interface Window {
    maplibregl: any;
    pmtiles: any;
    deck: any;
  }
}

declare module '@deck.gl/react';
declare module '@deck.gl/layers';
declare module '@deck.gl/mesh-layers';