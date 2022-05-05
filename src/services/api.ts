import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from 'nookies';
import { signOut } from "../contexts/AuthContext";
import { AuthTokenError } from "./errors/AuthTokenErro";

let isRefreshing = false;
let failedRequestQueue = [];

export function setupAPIClient(ctx = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`
    }
  });
  
  api.interceptors.response.use(response => {
    return response;
  }, (error : AxiosError) => {
    if (error.response.status === 401) {
      if (error.response.data?.code === 'token.expired') {
        //renovar o token
  
        cookies = parseCookies(ctx)
  
        const { 'nextauth.refreshToken': refreshToken } = cookies;
  
        const originalConfig = error.config;
  
        if (!isRefreshing) {
          isRefreshing = true;

          console.log('refresh');
  
          api.post('/refresh', {
            refreshToken,
          }).then(response => {
            const {token} = response.data;
    
            setCookie(ctx, 'nextauth.token', token, {
              maxAge: 60 * 60 * 24 * 30, //30 dias
              path: '/', //colocando path: /, qualque rendereço da nossa aplicação terá acesso ao token
            })
            setCookie(ctx, 'nextauth.refreshToken', response.data.refreshToken, {
              maxAge: 60 * 60 * 24 * 30, //30 dias
              path: '/',
            })
    
            api.defaults.headers['Authorization'] = `Bearer ${token}`;
  
            failedRequestQueue.forEach(request => request.onSucess(token));
            failedRequestQueue = [];
    
          })
          .catch(err => {
            failedRequestQueue.forEach(request => request.onFailur(err))
            failedRequestQueue = [];
  
           
            if(typeof window !== 'undefined') {
              signOut();
            }
          })
          .finally(() => {
            isRefreshing = false
          });
        }
  
        return new Promise((resolve, reject) => {
          failedRequestQueue.push({
            onSucess: (token: string) => {
              originalConfig.headers['Authorization'] = `Bearer ${token}`;
  
              resolve(api(originalConfig))
            },
            onFailur: (err: AxiosError) => {
              reject(err);
            },
          })
        })
      } else {
        if(typeof window !== 'undefined') {
          signOut();
        } else {
          return Promise.reject(new AuthTokenError())
        }
      }
    }
  
    return Promise.reject(error);
  });

  return api;
}