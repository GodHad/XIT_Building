'use client'
import { useRef } from 'react';
import ScreenSaver from './home/ScreenSaver';

export default function PageWrapper({ children }: { children: React.ReactNode }) {

    return (
        <div className='w-screen h-screen aspect-[16/9] !max-w-[1920px] !max-h-[1080px] flex items-center justify-center overflow-hidden' style={{ height: '100dvh'}}>
            {children}
            <ScreenSaver />
        </div>
    )
}