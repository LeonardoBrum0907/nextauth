import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { validateUserPermissions } from "../utils/validateUserPermissions";

type UseCanParams = {
  permissions?: string[];
  roles?: string[];
}

export function useCan({permissions, roles}: UseCanParams) {
  const {user, isAuthenticated} = useContext(AuthContext);

  //se ele nem estiver autenticado, já finaliza a função
  if(!isAuthenticated) {
    return false;
  }

  const userHasValidPermissions = validateUserPermissions({user, permissions, roles})

  return userHasValidPermissions;
}