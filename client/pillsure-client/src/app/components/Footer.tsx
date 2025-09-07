"use client";

import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const Footer: React.FC = () => {
  return (
    <footer className="bg-blue-900 text-gray-300 py-12">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Logo + Newsletter */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Image
              src="/logo.png"
              alt="Pill Sure Logo"
              width={40}
              height={40}
              className="h-10 w-auto"
            />
            <span className="text-white text-2xl font-bold">Pill Sure</span>
          </div>
          <p className="text-sm mb-6">
            Stay tuned for latest updates and new features
          </p>

          {/* Newsletter Input */}
          <div className="flex w-full md:w-auto mb-4">
            <Input
              type="email"
              placeholder="Email Address"
              className="rounded-l-xl text-xs"
            />
            <Button
              type="submit"
              className="rounded-r-xl bg-blue-500 hover:bg-blue-600 text-xs"
            >
              Subscribe
            </Button>
          </div>

          {/* Terms checkbox */}
          <label className="flex items-center text-sm">
            <Checkbox className="mr-2 border-gray-300" /> I accept terms and
            conditions & privacy policy
          </label>
        </div>

        {/* Information */}
        <div>
          <h3 className="text-white font-bold text-lg mb-4">Information</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#" className="hover:text-white transition">
                About us
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition">
                Delivery information
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition">
                Sales
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition">
                Terms & Conditions
              </a>
            </li>
          </ul>
        </div>

        {/* Account */}
        <div>
          <h3 className="text-white font-bold text-lg mb-4">Account</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#" className="hover:text-white transition">
                Dashboard
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition">
                My orders
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition">
                Account details
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition">
                Returns
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition">
                Wishlist
              </a>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h3 className="text-white font-bold text-lg mb-4">About / Contacts</h3>
          <p className="flex items-start mb-2 text-sm">
            📍 70 Washington Square South, New York, NY 10012, United States
          </p>
          <p className="flex items-center mb-4 text-sm">
            ✉️ pillsure786@gmail.com
          </p>

          {/* Socials */}
          <div className="flex space-x-3">
            <a href="#" className="bg-blue-500 p-2 rounded-full hover:bg-blue-600 transition duration-300" aria-label="Facebook">
              <svg className="h-5 w-5 fill-current text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.042c-5.466 0-9.92 4.398-9.92 9.8 0 4.354 3.12 8 7.214 8.795l.89.167v-6.24h-2.1c-.267 0-.533-.083-.75-.25-.217-.167-.383-.417-.467-.667l-.333-1.667h2.15l-.083-1.617c-.083-.75.467-1.333 1.167-1.333h2.367c.617 0 1.2.083 1.25.167l.167.333c.083.25.083.417.083.583v1.833h2.467c.25 0 .417.083.583.25.167.167.25.417.25.667v1.667h-2.467v6.24l.89-.167c4.094-.795 7.214-4.441 7.214-8.795 0-5.402-4.454-9.8-9.92-9.8z"/></svg>
            </a>
            <a href="#" className="bg-blue-500 p-2 rounded-full hover:bg-blue-600 transition duration-300" aria-label="Instagram">
              <svg className="h-5 w-5 fill-current text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c3.486 0 3.902.013 5.303.076 1.407.065 2.158.337 2.68.53.518.196.907.427 1.304.825.398.398.629.786.825 1.304.193.522.465 1.273.53 2.68.063 1.401.076 1.817.076 5.303s-.013 3.902-.076 5.303c-.065 1.407-.337 2.158-.53 2.68-.196.518-.427.907-.825 1.304-.398.398-.786.629-1.304.825-.522.193-1.273.465-2.68.53-1.401.063-1.817.076-5.303.076s-3.902-.013-5.303-.076c-1.407-.065-2.158-.337-2.68-.53-.518-.196-.907-.427-1.304-.825-.398-.398-.629-.786-.825-1.304-.193-.522-.465-1.273-.53-2.68C2.013 15.902 2 15.486 2 12s.013-3.486.076-5.303c.065-1.407.337-2.158.53-2.68.196-.518.427-.907.825-1.304.398-.398.786-.629.825-1.304.193-.522.465-1.273.53-2.68C8.098 2.013 8.514 2 12 2zm0 1.8c-3.418 0-3.864.013-5.207.074-1.267.058-1.936.304-2.29.438-.34.128-.616.297-.899.58-.283.283-.452.56-.58.899-.134.354-.38 1.023-.438 2.29C3.813 8.136 3.8 8.582 3.8 12s.013 3.864.074 5.207c.058 1.267.304 1.936.438 2.29.128.34.297.616.58.899.283.283.56.452.899.58.354.134 1.023.38 2.29.438C8.136 20.187 8.582 20.2 12 20.2s3.864-.013 5.207-.074c1.267-.058 1.936-.304 2.29-.438.34-.128.616-.297.899-.58.283-.283.56-.452.58-.899.134-.354.38-1.023.438-2.29C20.187 15.864 20.2 15.418 20.2 12s-.013-3.864-.074-5.207c-.058-1.267-.304-1.936-.438-2.29-.128-.34-.297-.616-.58-.899-.283-.283-.452-.56-.899-.58-.354-.134-1.023-.38-2.29-.438C15.864 3.813 15.418 3.8 12 3.8zM12 6.8c2.868 0 5.2 2.332 5.2 5.2s-2.332 5.2-5.2 5.2-5.2-2.332-5.2-5.2 2.332-5.2 5.2-5.2zm0 1.8c-1.87 0-3.4 1.53-3.4 3.4s1.53 3.4 3.4 3.4 3.4-1.53 3.4-3.4-1.53-3.4-3.4-3.4zm5.27-.404c0 1.066-.867 1.933-1.933 1.933s-1.933-.867-1.933-1.933c0-1.066.867-1.933 1.933-1.933s1.933.867 1.933 1.933z"/></svg>
            </a>
            <a href="#" className="bg-blue-500 p-2 rounded-full hover:bg-blue-600 transition duration-300" aria-label="LinkedIn">
              <svg className="h-5 w-5 fill-current text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.657 1.343 3 3 3h18c1.657 0 3-1.343 3-3V3c0-1.657-1.343-3-3-3zM8 19H5V8h3v11zM6.5 6.732c-.933 0-1.683-.767-1.683-1.701 0-.934.75-1.701 1.683-1.701.934 0 1.684.767 1.684 1.701 0 .934-.751 1.701-1.684 1.701zM19 19h-3v-5.604c0-3.366-4-3.116-4 0V19H9V8h3v1.731c.813-1.163 2.054-1.731 3.38-1.731 3.564 0 3.62 4.195 3.62 5.495V19z"/></svg>
            </a>
            <a href="#" className="bg-blue-500 p-2 rounded-full hover:bg-blue-600 transition duration-300" aria-label="Twitter">
              <svg className="h-5 w-5 fill-current text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.79-1.574 2.15-2.723-.95.556-2.008.95-3.13 1.16-.896-.957-2.173-1.556-3.593-1.556-2.719 0-4.925 2.206-4.925 4.925 0 .386.044.762.126 1.124-4.093-.205-7.722-2.162-10.151-5.132-.424.729-.668 1.579-.668 2.484 0 1.71.875 3.22 2.208 4.1-.81-.026-1.576-.248-2.238-.616v.06c0 2.38 1.696 4.368 3.946 4.82-.41.111-.842.17-1.288.17-.315 0-.621-.03-.918-.088.627 1.956 2.44 3.377 4.596 3.416-1.683 1.318-3.805 2.106-6.113 2.106-.398 0-.79-.023-1.175-.069 2.179 1.397 4.768 2.212 7.548 2.212 9.057 0 14.008-7.497 14.008-13.985 0-.213-.005-.426-.014-.637.962-.695 1.797-1.562 2.458-2.55z"/></svg>
            </a>
            <a href="#" className="bg-blue-500 p-2 rounded-full hover:bg-blue-600 transition duration-300" aria-label="YouTube">
              <svg className="h-5 w-5 fill-current text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21.5 7.18c-.2-.79-.81-.132-1.46-1.954-1.534-.73-2.929-.73-4.463-.73-.816 0-1.632.067-2.448.201-.817.134-1.534.401-2.201.735-.667.334-1.267.734-1.801 1.201-1.068.934-1.668 2.134-1.668 3.535 0 1.4.6 2.601 1.668 3.535.534.467 1.134.867 1.801 1.201.666.334 1.401.567 2.201.734.816.134 1.632.201 2.448.201 1.534 0 2.929 0 4.463-.73.65-.824 1.26-1.164 1.46-1.954.2-.79-.067-1.401-.067-2.201 0-.816.267-1.401.067-2.201zm-9.5 7.203V8.895l5.067 2.645-5.067 2.843z"/></svg>
            </a>
          </div>
        </div>
      </div>

      {/* Copyright & Payment */}
      <div className="border-t border-gray-700 mt-8 pt-6">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm">
          <p className="mb-4 md:mb-0">
            © 2024 Pill Sure. All Rights Reserved
          </p>
          <div className="flex space-x-4">
            {["/f1.png", "/f4.png", "/f3.png", "/f2.png"].map(
              (src, i) => (
                <Image
                  key={i}
                  src={src}
                  alt="Payment Method"
                  width={40}
                  height={24}
                  className="h-6 w-auto"
                />
              )
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
