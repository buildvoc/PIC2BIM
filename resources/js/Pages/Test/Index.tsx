import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/globals.css';
import App from "./app/App"
export function Edit({ }: PageProps) {
const { status } = usePage<{
  status : string
}>().props;

return (
    <App />
)
}
export default Edit;