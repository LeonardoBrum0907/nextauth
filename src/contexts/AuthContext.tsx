import Router from "next/router";
import { destroyCookie, parseCookies, setCookie } from 'nookies';
import { createContext, ReactNode, useEffect, useState } from "react";
import { api } from "../services/apiClient";

type User = {
  email: string;
  permissions: string[];
  roles: string[];
}

type AuthProviderProps = {
  children: ReactNode;
}

type SignInCredentials = {
  email: string;
  password: string;
}

type AuthContextData = {
  signIn(credentials: SignInCredentials): Promise<void>;//duas maneiras diferentes de tipar uma função
  signOut: () => void;//duas maneiras diferentes de tipar uma função
  isAuthenticated: boolean;
  user: User;
}

export const AuthContext = createContext({} as AuthContextData);

let authChannel: BroadcastChannel;

export function signOut() {
  destroyCookie(undefined, 'nextauth.token');
  destroyCookie(undefined, 'nextauth.refreshToken');

  authChannel.postMessage('signOut');

  Router.push('/');
}

export function AuthProvider({children}: AuthProviderProps) {
  const [user, setUser] = useState<User>();
  const isAuthenticated = !!user;

  useEffect(() => {
    authChannel = new BroadcastChannel('auth');

    authChannel.onmessage = (message => {
      switch (message.data) {
        case 'signOut' : signOut();
          break;
        default: break;
      }
    })
  },[])

  useEffect(() => {
    const {'nextauth.token': token} = parseCookies();

    if(token) {
      api.get('/me').then(response => {
        const {email, permissions, roles} = response.data

        setUser({email, permissions, roles})
      })
      .catch(() => {
        signOut()
      })
    }

  }, [])

  async function signIn({email,password}: SignInCredentials) {
    try {
      const response = await api.post('sessions', {
        email,
        password,
      })

      const {permissions, roles, token, refreshToken} = response.data;

      setCookie(undefined, 'nextauth.token', token, {
        maxAge: 60 * 60 * 24 * 30, //30 dias
        path: '/', //colocando path: /, qualque rendereço da nossa aplicação terá acesso ao token
      })
      setCookie(undefined, 'nextauth.refreshToken', refreshToken, {
        maxAge: 60 * 60 * 24 * 30, //30 dias
        path: '/',
      })

      setUser({
        email,
        permissions,
        roles,
      })

      api.defaults.headers['Authorization'] = `Bearer ${token}`;

      Router.push('/dashboard');
    } catch (err){
      console.log(err)
    }
  }

  return (
    <AuthContext.Provider value={{signIn, signOut, isAuthenticated,user}}>
      {children}
    </AuthContext.Provider>
  )
}