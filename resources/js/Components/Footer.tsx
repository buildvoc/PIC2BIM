import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className={`site-footer`}>
            <div className={`site-footer-container`}>
                <p className={`text-center`}>&copy; {new Date().getFullYear()} pic2bim.co.uk</p>
            </div>
        </footer>
    )
}

export default Footer;
