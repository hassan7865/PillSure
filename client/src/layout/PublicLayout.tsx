import Footer from '@/app/components/Footer'
import Navbar from '@/app/components/Navbar'
import React from 'react'

const PublicLayout = ({children}: {children: React.ReactNode}) => {
  return (
    <div className="min-h-screen">
    <Navbar />
    {children}
    <Footer />
    </div>
  )
}

export default PublicLayout