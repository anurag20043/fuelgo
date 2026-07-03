import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export const FUEL_LABELS = {
  petrol: "Petrol",
  diesel: "Diesel",
};

export const STATUS_LABELS = {
  pending: "Pending",
  assigned: "Assigned",
  en_route: "En Route",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_ORDER = ["pending", "assigned", "en_route", "delivered"];
