import { Route, Routes } from 'react-router-dom';
import LayoutComponent from './components/layout';
import HomePage from './pages';

const RoutesComponent = () => {
  return(
    <LayoutComponent>
      <Routes>
        <Route path="/" element={ <HomePage /> } />
        <Route path="/about" element={<h1>About</h1>} />
        <Route path="/contact" element={<h1>Contact</h1>} />
      </Routes>
    </LayoutComponent>
  )
}

export default RoutesComponent;
