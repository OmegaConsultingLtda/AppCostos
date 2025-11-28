'use client';

import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AuthScreen() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (error: any) {
      setLoginError(error.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    try {
      await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
    } catch (error: any) {
      setRegisterError(error.message);
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
          <a href="#" className="text-sm text-indigo-400 hover:text-indigo-300 text-center block mt-2">¿Olvidaste tu contraseña?</a>
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
