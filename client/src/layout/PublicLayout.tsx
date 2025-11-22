import Footer from '@/app/components/Footer'
import Navbar from '@/app/components/Navbar'
import React from 'react'

const PublicLayout = ({children}: {children: React.ReactNode}) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16 sm:pt-20">
        {children}
      </main>
      <Footer />
    </div>
  )
}

export default PublicLayout