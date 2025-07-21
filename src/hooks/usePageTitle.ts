
import { useLocation } from "react-router-dom";
import { getPageName } from "@/utils/pageNames";

export const usePageTitle = () => {
  const location = useLocation();
  
  const pageName = getPageName(location.pathname);
  
  return {
    pageName,
    pathname: location.pathname
  };
};
