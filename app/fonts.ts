import localFont from 'next/font/local';

export const staatliches = localFont({
    src: [
        {
            path: '../public/fonts/Staatliches-Regular.woff',
            weight: '400',
            style: 'normal'
        }
    ],
    variable: '--font-staatliches',
    display: 'swap',
});

export const lexendDeca = localFont({
    src: [
        {
            path: '../public/fonts/LexendDeca-Regular.woff',
            weight: '400',
            style: 'normal'
        },
        {
            path: '../public/fonts/LEXENDDECA-SEMIBOLD.woff',
            weight: '500',
            style: 'normal'
        }
    ],
    variable: '--font-lexendDeca',
    display: 'swap',
});