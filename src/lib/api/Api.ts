import Cookies from 'js-cookie';

import Defaults from '../../constants/Defaults';

const API_URL = process.env.REACT_APP_BASE_URL || `http://localhost:3003/api/`;
const ACCESS_TOKEN_HEADER_KEY = 'Authorization';

export enum HttpMethod {
  GET = 'GET',
  PATCH = 'PATCH',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE'
}

export enum HttpStatusCode {
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404
}

export const StaticUrls = {
  REFRESH: API_URL + 'users/refresh'
};

export interface ApiParams {
  [key: string]: any;
}

export const setAccessToken = (accessToken: string, refreshToken: string) => {
  Cookies.set(Defaults.ACCESS_TOKEN_COOKIE_KEY, accessToken);
  Cookies.set(Defaults.REFRESH_TOKEN_COOKIE_KEY, refreshToken);
};

export const removeAccessToken = () => {
  Cookies.remove(Defaults.ACCESS_TOKEN_COOKIE_KEY);
  Cookies.remove(Defaults.REFRESH_TOKEN_COOKIE_KEY);
};

export async function apiHelper(method: string = HttpMethod.GET, path: string, params: ApiParams = {}) {
  const accessToken = Cookies.get(Defaults.ACCESS_TOKEN_COOKIE_KEY);

  const defaultOptions = {
    method,
    headers: {
      [ACCESS_TOKEN_HEADER_KEY]: 'Bearer ' + accessToken
    }
  };

  let query;
  let requestOptions: any = {
    ...defaultOptions
  };
  if (method === HttpMethod.GET || method === HttpMethod.DELETE) {
    query = Object.entries(params)
      .map(([paramKey, paramValue]) => `${encodeURIComponent(paramKey)}=${encodeURIComponent(paramValue)}`)
      .join('&');
  } else if (method === HttpMethod.PATCH || method === HttpMethod.POST || method === HttpMethod.PUT) {
    const headers = {
      ...defaultOptions.headers,
      'content-type': 'application/json'
    };
    requestOptions = {
      ...defaultOptions,
      headers,
      body: JSON.stringify(params)
    };
  }

  const apiUrl = API_URL;

  const urlPath = `${apiUrl}${path}`;
  const url = query ? `${urlPath}?${query}` : `${urlPath}`;

  let response = await fetch(url, requestOptions);
  let body;
  try {
    body = await response.json();
  } catch (error) {}
  if (response.status === HttpStatusCode.FORBIDDEN) {
    const refreshToken = Cookies.get(Defaults.REFRESH_TOKEN_COOKIE_KEY);
    let refreshOptions: any = { method: HttpMethod.GET, headers: { [ACCESS_TOKEN_HEADER_KEY]: 'Bearer ' + refreshToken } };
    response = await fetch(StaticUrls.REFRESH, refreshOptions);
    try {
      body = await response.json();
    } catch (error) {}
    if (response.ok) {
      Cookies.set(Defaults.ACCESS_TOKEN_COOKIE_KEY, body.accessToken);
      Cookies.set(Defaults.REFRESH_TOKEN_COOKIE_KEY, body.refreshToken);
      requestOptions = { method, headers: { [ACCESS_TOKEN_HEADER_KEY]: body.accessToken } };
      response = await fetch(url, requestOptions);
      try {
        body = await response.json();
      } catch (error) {}
    }
  }
  return [response, body];
}

export const Api = {
  async get(path: string, params?: ApiParams) {
    return apiHelper(HttpMethod.GET, path, params);
  },
  async post(path: string, params?: ApiParams) {
    return apiHelper(HttpMethod.POST, path, params);
  },
  async put(path: string, params?: ApiParams) {
    return apiHelper(HttpMethod.PUT, path, params);
  },
  async delete(path: string, params?: ApiParams) {
    return apiHelper(HttpMethod.DELETE, path, params);
  }
};

export default Api;
