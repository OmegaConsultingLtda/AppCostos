'use client';

import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '@/lib/firebase';

export default function AuthScreen() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (error: unknown) {
      console.error('Error al iniciar sesión', error);
      if (error instanceof FirebaseError && error.code === 'auth/invalid-credential') {
        setLoginError("Email o contraseña incorrectos.");
      } else {
        setLoginError("No se pudo iniciar sesión. Intenta nuevamente.");
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    try {
      await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
    } catch (error: unknown) {
      console.error('Error al registrar cuenta', error);
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/email-already-in-use') {
          setRegisterError("El email ya está registrado.");
        } else if (error.code === 'auth/weak-password') {
          setRegisterError("La contraseña debe tener al menos 6 caracteres.");
        } else {
          setRegisterError("Error al registrar la cuenta.");
        }
      } else {
        setRegisterError("Error inesperado al registrar la cuenta.");
      }
    }
  };

  const handlePasswordReset = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setResetMessage('');
    const email = window.prompt("Ingresa el email asociado a tu cuenta:");
    if (!email) return;

    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage('Si el email está registrado, recibirás un enlace para restablecer la contraseña.');
    } catch (error) {
      console.error('Error al enviar correo de recuperación', error);
      setResetMessage('No se pudo enviar el correo de recuperación. Intenta nuevamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md mx-4 bg-gray-800 p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-white text-center mb-6">Acceso al Panel Financiero</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="loginEmail" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              id="loginEmail"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:outline-none focus:border-indigo-500"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
            <input
              type="password"
              id="loginPassword"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:outline-none focus:border-indigo-500"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Iniciar Sesión
          </button>
          {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
          <a 
            href="#" 
            onClick={handlePasswordReset}
            className="text-sm text-indigo-400 hover:text-indigo-300 text-center block mt-2"
          >
            ¿Olvidaste tu contraseña?
          </a>
          {resetMessage && <p className="text-green-400 text-xs text-center mt-2">{resetMessage}</p>}
        </form>

        <div className="my-6 flex items-center">
          <hr className="flex-grow border-gray-600" />
          <span className="px-4 text-gray-400 text-sm">o</span>
          <hr className="flex-grow border-gray-600" />
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="registerEmail" className="block text-sm font-medium text-gray-300 mb-1">Email para Registrarse</label>
            <input
              type="email"
              id="registerEmail"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:outline-none focus:border-teal-500"
              required
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="registerPassword" className="block text-sm font-medium text-gray-300 mb-1">Crear Contraseña</label>
            <input
              type="password"
              id="registerPassword"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:outline-none focus:border-teal-500"
              required
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Crear Cuenta Nueva
          </button>
          {registerError && <p className="text-red-400 text-sm text-center">{registerError}</p>}
        </form>
      </div>
    </div>
  );
}
