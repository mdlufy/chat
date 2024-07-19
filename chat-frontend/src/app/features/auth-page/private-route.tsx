import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from 'src/app/providers/auth-provider/auth-provider';

const PrivateRoute: React.FC = () => {
    const { isAuth } = useContext(AuthContext);

    return !isAuth ? <Navigate to="/login" /> : <Outlet />;
};

export default PrivateRoute;
