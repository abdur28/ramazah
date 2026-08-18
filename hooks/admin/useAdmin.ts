import { create } from "zustand";
import { AdminStore } from "@/types/admin";
import useAdminUsersData from "./useAdminUsersData";
import useAdminCategoriesData from "./useAdminCategoriesData";
import useAdminProductsData from "./useAdminProductsData";
import useAdminCollectionsData from "./useAdminCollectionsData";
import useAdminOrdersData from "./useAdminOrdersData";
import useAdminMailer from "./useAdminMailer";
import useAdminAnalyticsData from "./useAdminAnalyticsData";

/**
 * Main admin hook that combines all specialized admin hooks
 * This provides a single entry point for accessing all admin functionality
 */
const useAdmin = create<AdminStore>((set, get) => {
  // Get initial state from sub-stores
  const userDataState = useAdminUsersData.getState();
  const categoryDataState = useAdminCategoriesData.getState();
  const collectionDataState = useAdminCollectionsData.getState();
  const productDataState = useAdminProductsData.getState();
  const orderDataState = useAdminOrdersData.getState();
  const mailerDataState = useAdminMailer.getState();
  const analyticsDataState = useAdminAnalyticsData.getState();

  // Helper function to wrap async methods to ensure direct updates to main store
  const wrapAsyncMethod = (method: Function, storeUpdater: Function) => {
    return async (...args: any[]) => {
      const result = await method(...args);
      const newState = storeUpdater();
      set((currentState) => ({
        ...currentState,
        ...newState
      }));
      return result;
    };
  };

  // Wrap all user data methods
  const wrappedUserMethods = Object.keys(userDataState)
    .filter(key => typeof userDataState[key as keyof typeof userDataState] === 'function')
    .reduce((methods, key) => {
      methods[key] = wrapAsyncMethod(
        userDataState[key as keyof typeof userDataState] as Function,
        () => useAdminUsersData.getState()
      );
      return methods;
    }, {} as Record<string, any>);

  // Wrap all category data methods
  const wrappedCategoryMethods = Object.keys(categoryDataState)
    .filter(key => typeof categoryDataState[key as keyof typeof categoryDataState] === 'function')
    .reduce((methods, key) => {
      methods[key] = wrapAsyncMethod(
        categoryDataState[key as keyof typeof categoryDataState] as Function,
        () => useAdminCategoriesData.getState()
      );
      return methods;
    }, {} as Record<string, any>);

  // Wrap all collection data methods
  const wrappedCollectionMethods = Object.keys(collectionDataState)
    .filter(key => typeof collectionDataState[key as keyof typeof collectionDataState] === 'function')
    .reduce((methods, key) => {
      methods[key] = wrapAsyncMethod(
        collectionDataState[key as keyof typeof collectionDataState] as Function,
        () => useAdminCollectionsData.getState()
      );
      return methods;
    }, {} as Record<string, any>);

  // Wrap all product data methods
  const wrappedProductMethods = Object.keys(productDataState)
    .filter(key => typeof productDataState[key as keyof typeof productDataState] === 'function')
    .reduce((methods, key) => {
      methods[key] = wrapAsyncMethod(
        productDataState[key as keyof typeof productDataState] as Function,
        () => useAdminProductsData.getState()
      );
      return methods;
    }, {} as Record<string, any>);

  // Wrap all order data methods
  const wrappedOrderMethods = Object.keys(orderDataState)
    .filter(key => typeof orderDataState[key as keyof typeof orderDataState] === 'function')
    .reduce((methods, key) => {
      methods[key] = wrapAsyncMethod(
        orderDataState[key as keyof typeof orderDataState] as Function,
        () => useAdminOrdersData.getState()
      );
      return methods;
    }, {} as Record<string, any>);

  // Wrap all mailer methods
  const wrappedMailerMethods = Object.keys(mailerDataState)
    .filter(key => typeof mailerDataState[key as keyof typeof mailerDataState] === 'function')
    .reduce((methods, key) => {
      methods[key] = wrapAsyncMethod(
        mailerDataState[key as keyof typeof mailerDataState] as Function,
        () => useAdminMailer.getState()
      );
      return methods;
    }, {} as Record<string, any>);

  // Wrap all analytics methods
  const wrappedAnalyticsMethods = Object.keys(analyticsDataState)
    .filter(key => typeof analyticsDataState[key as keyof typeof analyticsDataState] === 'function')
    .reduce((methods, key) => {
      methods[key] = wrapAsyncMethod(
        analyticsDataState[key as keyof typeof analyticsDataState] as Function,
        () => useAdminAnalyticsData.getState()
      );
      return methods;
    }, {} as Record<string, any>);

  // Global reset errors function
  const resetErrors = () => {
    useAdminUsersData.setState(state => ({
      error: { ...state.error, users: null, adminAction: null }
    }));
    useAdminCategoriesData.setState(state => ({
      error: { ...state.error, categories: null, adminAction: null }
    }));
    useAdminCollectionsData.setState(state => ({
      error: { ...state.error, collections: null, adminAction: null }
    }));
    useAdminProductsData.setState(state => ({
      error: { ...state.error, products: null, adminAction: null }
    }));
    useAdminOrdersData.setState(state => ({
      error: { ...state.error, orders: null, adminAction: null }
    }));
    useAdminMailer.setState(state => ({
      error: { ...state.error, users: null, adminAction: null }
    }));
    useAdminAnalyticsData.setState(state => ({
      error: { ...state.error, analytics: null, adminAction: null }
    }));
  };

  // Subscribe to all stores
  useAdminUsersData.subscribe((state) => {
    const stateWithoutMethods = Object.fromEntries(
      Object.entries(state).filter(([_, value]) => typeof value !== 'function')
    );
    set((currentState) => ({ ...currentState, ...stateWithoutMethods }));
  });

  useAdminCategoriesData.subscribe((state) => {
    const stateWithoutMethods = Object.fromEntries(
      Object.entries(state).filter(([_, value]) => typeof value !== 'function')
    );
    set((currentState) => ({ ...currentState, ...stateWithoutMethods }));
  });

  useAdminCollectionsData.subscribe((state) => {
    const stateWithoutMethods = Object.fromEntries(
      Object.entries(state).filter(([_, value]) => typeof value !== 'function')
    );
    set((currentState) => ({ ...currentState, ...stateWithoutMethods }));
  });

  useAdminProductsData.subscribe((state) => {
    const stateWithoutMethods = Object.fromEntries(
      Object.entries(state).filter(([_, value]) => typeof value !== 'function')
    );
    set((currentState) => ({ ...currentState, ...stateWithoutMethods }));
  });

  useAdminOrdersData.subscribe((state) => {
    const stateWithoutMethods = Object.fromEntries(
      Object.entries(state).filter(([_, value]) => typeof value !== 'function')
    );
    set((currentState) => ({ ...currentState, ...stateWithoutMethods }));
  });

  useAdminMailer.subscribe((state) => {
    const stateWithoutMethods = Object.fromEntries(
      Object.entries(state).filter(([_, value]) => typeof value !== 'function')
    );
    set((currentState) => ({ ...currentState, ...stateWithoutMethods }));
  });

  useAdminAnalyticsData.subscribe((state) => {
    const stateWithoutMethods = Object.fromEntries(
      Object.entries(state).filter(([_, value]) => typeof value !== 'function')
    );
    set((currentState) => ({ ...currentState, ...stateWithoutMethods }));
  });

  // Create the combined store
  return {
    ...userDataState,
    ...categoryDataState,
    ...collectionDataState,
    ...productDataState,
    ...orderDataState,
    ...mailerDataState,
    ...analyticsDataState,
    ...wrappedUserMethods,
    ...wrappedCategoryMethods,
    ...wrappedCollectionMethods,
    ...wrappedProductMethods,
    ...wrappedOrderMethods,
    ...wrappedMailerMethods,
    ...wrappedAnalyticsMethods,
    resetErrors,
  };
});

export default useAdmin;