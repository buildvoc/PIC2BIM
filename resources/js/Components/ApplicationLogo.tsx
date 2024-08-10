import { ImgHTMLAttributes } from 'react';

export default function ApplicationLogo(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="https://pic2bim.co.uk/img/logo_egnss4all_white.svg"
            alt="Logo"
            {...props}
        />
    );
}
