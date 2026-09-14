import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SavedProvider } from '@/contexts/SavedContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoginModal from '@/components/LoginModal';

export const metadata = {
  title: 'Ivy Homes — Real Estate Intelligence · Bangalore',
  description: 'Ivy Homes Property Portal — verified listings, rentals, builder projects and market insights for Bangalore real estate.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <SavedProvider>
              <div className="app-layout">
                <Navbar />
                <main className="main-content">
                  {children}
                </main>
                <Footer />
                <LoginModal />
              </div>
            </SavedProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
