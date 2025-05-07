import React from 'react';

type FooterProps = {
    isDark: boolean;
};

const Footer: React.FC<FooterProps> = ({isDark}) => {
    return (
        <footer className={`site-footer ${isDark ? "dark-footer" : ""}`}>
            <div className={`site-footer-container`}>
                <p className={`text-center`}>&copy; {new Date().getFullYear()} pic2bim.co.uk</p>
            </div>
        </footer>
    )
}

export default Footer;
