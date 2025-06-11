import { useState, useEffect } from 'react';
import { FaShoppingCart, FaUsers, FaSignOutAlt, FaPlus, FaTrash, FaSearch, FaShoppingBag, FaCalendarAlt, FaEuroSign, FaUserPlus, FaPhone, FaTag, FaBox, FaMinus, FaEdit } from 'react-icons/fa';
import logo from './logo.jpg';
import CitasPage from './components/CitasPage';
import { db, auth } from './services/firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query, addDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('productos');
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: '', precio: '', stock: '' });
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', telefono: '', numeroCliente: '', observaciones: '', trabajos: [] });
  const [nuevoTrabajo, setNuevoTrabajo] = useState({ servicio: '', fecha: '', precio: '' });
  const [editandoTrabajo, setEditandoTrabajo] = useState(null);
  const [trabajoEditando, setTrabajoEditando] = useState({ servicio: '', fecha: '', precio: '' });
  const [showModalEditTrabajo, setShowModalEditTrabajo] = useState(false);
  const [editandoObservaciones, setEditandoObservaciones] = useState(null);
  const [observacionesEditando, setObservacionesEditando] = useState('');
  const [showModalEditObservaciones, setShowModalEditObservaciones] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [nuevaNota, setNuevaNota] = useState('');
  const [nuevaCompra, setNuevaCompra] = useState({ producto: '', cantidad: '', precio: '' });
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [showModalProducto, setShowModalProducto] = useState(false);
  const [showModalCliente, setShowModalCliente] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log('Estado de autenticación cambiado:', user);
      setUser(user);
      setLoading(false);
      if (user) {
        console.log('Usuario autenticado, configurando listeners...');
        
        // Configurar listener en tiempo real para productos
        const unsubscribeProductos = onSnapshot(collection(db, 'productos'), (snapshot) => {
          const productosData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log('Productos actualizados en tiempo real:', productosData);
          setProductos(productosData);
        }, (error) => {
          console.error('Error en listener de productos:', error);
          setError('Error al cargar los productos en tiempo real.');
        });

        // Configurar listener en tiempo real para clientes
        const unsubscribeClientes = onSnapshot(collection(db, 'clientes'), (snapshot) => {
          const clientesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log('Clientes actualizados en tiempo real:', clientesData);
          setClientes(clientesData);
        }, (error) => {
          console.error('Error en listener de clientes:', error);
          setError('Error al cargar los clientes en tiempo real.');
        });

        // Retornar función de limpieza para ambos listeners
        return () => {
          unsubscribeProductos();
          unsubscribeClientes();
        };

      } else {
        console.log('No hay usuario autenticado');
        setProductos([]);
        setClientes([]);
      }
    });
    return () => unsubscribeAuth();
  }, []); // El array de dependencias está vacío porque onAuthStateChanged solo se suscribe una vez

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const email = e.target.email.value;
    const password = e.target.password.value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      setError('Error al iniciar sesión. Por favor, verifica tus credenciales.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleAddProducto = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      console.log('Intentando agregar producto:', nuevoProducto);
      
      if (!nuevoProducto.nombre || !nuevoProducto.precio || !nuevoProducto.stock) {
        setError('Por favor, completa todos los campos');
        return;
      }

      const productoData = {
        nombre: nuevoProducto.nombre,
        precio: parseFloat(nuevoProducto.precio),
        stock: parseInt(nuevoProducto.stock),
        createdAt: new Date().toISOString(),
        userId: user.uid
      };

      console.log('Datos del producto a guardar:', productoData);

      const docRef = await addDoc(collection(db, 'productos'), productoData);
      console.log('Producto agregado con ID:', docRef.id);

      setNuevoProducto({ nombre: '', precio: '', stock: '' });
      setShowModalProducto(false);
    } catch (error) {
      console.error('Error detallado al agregar producto:', error);
      setError(`Error al agregar el producto: ${error.message}. Por favor, intenta de nuevo.`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTrabajo = async (clienteId) => {
    try {
      if (!nuevoTrabajo.servicio || !nuevoTrabajo.fecha || !nuevoTrabajo.precio) {
        setError('Por favor, completa todos los campos del trabajo');
        return;
      }

      const clienteRef = doc(db, 'clientes', clienteId);
      const clienteDoc = await getDoc(clienteRef);
      const trabajosActuales = clienteDoc.data().trabajos || [];

      await updateDoc(clienteRef, {
        trabajos: [...trabajosActuales, {
          ...nuevoTrabajo,
          fecha: new Date(nuevoTrabajo.fecha).toISOString(),
          precio: parseFloat(nuevoTrabajo.precio)
        }]
      });

      setNuevoTrabajo({ servicio: '', fecha: '', precio: '' });
    } catch (error) {
      console.error('Error al agregar trabajo:', error);
      setError('Error al agregar el trabajo');
    }
  };

  const handleAddCliente = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (!nuevoCliente.nombre || !nuevoCliente.telefono || !nuevoCliente.numeroCliente) {
        setError('Por favor, completa todos los campos obligatorios');
        return;
      }

      // Verificar que el número de cliente sea único
      const numeroClienteExistente = clientes.find(cliente => 
        cliente.numeroCliente === nuevoCliente.numeroCliente
      );
      
      if (numeroClienteExistente) {
        setError('El número de cliente ya existe. Por favor, usa otro número.');
        return;
      }

      const clienteData = {
        nombre: nuevoCliente.nombre,
        telefono: nuevoCliente.telefono,
        numeroCliente: nuevoCliente.numeroCliente,
        observaciones: nuevoCliente.observaciones || '',
        trabajos: [],
        createdAt: new Date().toISOString()
      };

      console.log('Datos del cliente a guardar:', clienteData);
      await addDoc(collection(db, 'clientes'), clienteData);
      console.log('Cliente agregado exitosamente');

      setNuevoCliente({ nombre: '', telefono: '', numeroCliente: '', observaciones: '', trabajos: [] });
      setShowModalCliente(false);
    } catch (error) {
      console.error('Error al agregar cliente:', error);
      setError(`Error al agregar el cliente: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNota = async () => {
    if (!clienteSeleccionado || !nuevaNota) return;
    try {
      const clienteRef = doc(db, 'clientes', clienteSeleccionado.id);
      await updateDoc(clienteRef, {
        notas: [...clienteSeleccionado.notas, {
          texto: nuevaNota,
          fecha: new Date().toISOString()
        }]
      });
      setNuevaNota('');
    } catch (error) {
      console.error('Error al agregar nota:', error);
    }
  };

  const handleAddCompra = async () => {
    if (!clienteSeleccionado || !nuevaCompra.producto) return;
    try {
      const clienteRef = doc(db, 'clientes', clienteSeleccionado.id);
      await updateDoc(clienteRef, {
        compras: [...clienteSeleccionado.compras, {
          ...nuevaCompra,
          fecha: new Date().toISOString()
        }]
      });
      setNuevaCompra({ producto: '', cantidad: '', precio: '' });
    } catch (error) {
      console.error('Error al agregar compra:', error);
    }
  };

  const handleDeleteProducto = async (id) => {
    try {
      await deleteDoc(doc(db, 'productos', id));
    } catch (error) {
      console.error('Error al eliminar producto:', error);
    }
  };

  const handleDeleteCliente = async (id) => {
    try {
      await deleteDoc(doc(db, 'clientes', id));
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
    }
  };

  const handleUpdateProducto = async (id, nuevosDatos) => {
    try {
      // Verificar si es una venta (reducción de stock)
      if (nuevosDatos.stock !== undefined) {
        const producto = productos.find(p => p.id === id);
        if (producto && producto.stock <= 0) {
          setError('No quedan existencias de este producto');
          return;
        }
      }
      await updateDoc(doc(db, 'productos', id), nuevosDatos);
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      setError('Error al actualizar el producto');
    }
  };

  const handleUpdateCliente = async (id, nuevosDatos) => {
    try {
      await updateDoc(doc(db, 'clientes', id), nuevosDatos);
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
    }
  };

  const filtrarProductos = () => {
    return productos.filter(producto =>
      producto && producto.nombre && producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  };

  const filtrarClientes = () => {
    return clientes.filter(cliente =>
      cliente && cliente.nombre && cliente.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  };

  const handleRemoveStock = async (productoId) => {
    try {
      const productoRef = doc(db, 'productos', productoId);
      const productoDoc = await getDoc(productoRef);
      if (productoDoc.exists()) {
        const currentStock = productoDoc.data().stock;
        if (currentStock > 0) {
          await updateDoc(productoRef, { stock: currentStock - 1 });
          console.log('Stock de producto decrementado');
        } else {
          console.log('Stock en 0, no se puede decrementar más');
        }
      }
    } catch (error) {
      console.error('Error al decrementar stock:', error);
      setError('Error al decrementar stock.');
    }
  };

  const handleAddStock = async (productoId) => {
    try {
      const productoRef = doc(db, 'productos', productoId);
      const productoDoc = await getDoc(productoRef);
      if (productoDoc.exists()) {
        const currentStock = productoDoc.data().stock;
        await updateDoc(productoRef, { stock: currentStock + 1 });
        console.log('Stock de producto incrementado');
      }
    } catch (error) {
      console.error('Error al incrementar stock:', error);
      setError('Error al incrementar stock.');
    }
  };

  const handleDeleteTrabajo = async (clienteId, trabajoIndex) => {
    try {
      const clienteRef = doc(db, 'clientes', clienteId);
      const clienteDoc = await getDoc(clienteRef);
      const trabajosActuales = clienteDoc.data().trabajos || [];
      
      // Eliminar el trabajo del array
      const trabajosActualizados = trabajosActuales.filter((_, index) => index !== trabajoIndex);
      
      await updateDoc(clienteRef, {
        trabajos: trabajosActualizados
      });
      
      console.log('Trabajo eliminado exitosamente');
    } catch (error) {
      console.error('Error al eliminar trabajo:', error);
      setError('Error al eliminar el trabajo');
    }
  };

  const handleEditTrabajo = (clienteId, trabajoIndex, trabajo) => {
    setEditandoTrabajo({ clienteId, trabajoIndex });
    setTrabajoEditando({
      servicio: trabajo.servicio,
      fecha: trabajo.fecha.split('T')[0], // Convertir a formato YYYY-MM-DD para el input date
      precio: trabajo.precio.toString()
    });
    setShowModalEditTrabajo(true);
  };

  const handleUpdateTrabajo = async (e) => {
    e.preventDefault();
    try {
      if (!trabajoEditando.servicio || !trabajoEditando.fecha || !trabajoEditando.precio) {
        setError('Por favor, completa todos los campos del trabajo');
        return;
      }

      const clienteRef = doc(db, 'clientes', editandoTrabajo.clienteId);
      const clienteDoc = await getDoc(clienteRef);
      const trabajosActuales = clienteDoc.data().trabajos || [];

      // Actualizar el trabajo específico
      const trabajosActualizados = trabajosActuales.map((trabajo, index) => {
        if (index === editandoTrabajo.trabajoIndex) {
          return {
            servicio: trabajoEditando.servicio,
            fecha: new Date(trabajoEditando.fecha).toISOString(),
            precio: parseFloat(trabajoEditando.precio)
          };
        }
        return trabajo;
      });

      await updateDoc(clienteRef, {
        trabajos: trabajosActualizados
      });

      setShowModalEditTrabajo(false);
      setEditandoTrabajo(null);
      setTrabajoEditando({ servicio: '', fecha: '', precio: '' });
      console.log('Trabajo actualizado exitosamente');
    } catch (error) {
      console.error('Error al actualizar trabajo:', error);
      setError('Error al actualizar el trabajo');
    }
  };

  const handleEditObservaciones = (clienteId, observacionesActuales) => {
    setEditandoObservaciones(clienteId);
    setObservacionesEditando(observacionesActuales || '');
    setShowModalEditObservaciones(true);
  };

  const handleUpdateObservaciones = async (e) => {
    e.preventDefault();
    try {
      const clienteRef = doc(db, 'clientes', editandoObservaciones);
      await updateDoc(clienteRef, {
        observaciones: observacionesEditando
      });

      setShowModalEditObservaciones(false);
      setEditandoObservaciones(null);
      setObservacionesEditando('');
      console.log('Observaciones actualizadas exitosamente');
    } catch (error) {
      console.error('Error al actualizar observaciones:', error);
      setError('Error al actualizar las observaciones');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-6 text-center">Iniciar Sesión</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contraseña</label>
              <input
                type="password"
                name="password"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <img src={logo} alt="Logo" className="h-12 w-auto mr-4" />
              <h1 className="text-xl font-bold text-white">Gestión Ali Sánchez Estilista</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="ml-4 px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-800"
              >
                <FaSignOutAlt className="inline-block mr-2" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('productos')}
              className={`flex items-center px-4 py-2 rounded-lg ${
                activeTab === 'productos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <FaShoppingCart className="mr-2" />
              Productos
            </button>
            <button
              onClick={() => setActiveTab('clientes')}
              className={`flex items-center px-4 py-2 rounded-lg ${
                activeTab === 'clientes'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <FaUsers className="mr-2" />
              Clientes
            </button>
            <button
              onClick={() => setActiveTab('citas')}
              className={`flex items-center px-4 py-2 rounded-lg ${
                activeTab === 'citas'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <FaCalendarAlt className="mr-2" />
              Citas
            </button>
          </div>

          <div className="bg-gray-800 rounded-xl shadow-lg p-6">
            {activeTab === 'productos' ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Productos</h2>
                  <div className="flex space-x-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar productos..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    </div>
                    <button
                      onClick={() => setShowModalProducto(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                    >
                      <FaPlus className="inline-block mr-2" />
                      Nuevo Producto
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtrarProductos().map((producto) => (
                    <div key={producto.id} className="bg-gray-700 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-white">{producto?.nombre || 'Sin nombre'}</h3>
                          <span className="px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-sm font-medium">
                            Stock: {producto?.stock || 0}
                          </span>
                        </div>
                        <div className="space-y-2 mb-6">
                          <div className="flex items-center text-gray-300">
                            <FaEuroSign className="mr-2" />
                            <span className="font-medium">{producto?.precio || 0}</span>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-between space-x-2">
                          <button 
                            onClick={() => handleAddStock(producto.id)} 
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex-grow flex items-center justify-center"
                          >
                            <FaPlus className="mr-2" /> Añadir
                          </button>
                          <button 
                            onClick={() => handleRemoveStock(producto.id)} 
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex-grow flex items-center justify-center"
                          >
                            <FaMinus className="mr-2" /> Vender
                          </button>
                          <button 
                            onClick={() => handleDeleteProducto(producto.id)} 
                            className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Modal para nuevo producto */}
                {showModalProducto && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full">
                    <div className="relative top-20 mx-auto p-5 border border-gray-700 w-96 shadow-lg rounded-xl bg-gray-800">
                      <div className="mt-3">
                        <h3 className="text-xl font-bold text-white mb-4">Nuevo Producto</h3>
                        {error && (
                          <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-200 rounded-lg">
                            {error}
                          </div>
                        )}
                        <form onSubmit={handleAddProducto} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaTag className="text-gray-500" />
                              </div>
                              <input
                                type="text"
                                value={nuevoProducto.nombre}
                                onChange={(e) => setNuevoProducto({...nuevoProducto, nombre: e.target.value})}
                                className="pl-10 block w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Precio</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaEuroSign className="text-gray-500" />
                              </div>
                              <input
                                type="number"
                                value={nuevoProducto.precio}
                                onChange={(e) => setNuevoProducto({...nuevoProducto, precio: e.target.value})}
                                className="pl-10 block w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Stock</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaBox className="text-gray-500" />
                              </div>
                              <input
                                type="number"
                                value={nuevoProducto.stock}
                                onChange={(e) => setNuevoProducto({...nuevoProducto, stock: e.target.value})}
                                className="pl-10 block w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-3">
                            <button
                              type="button"
                              onClick={() => setShowModalProducto(false)}
                              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200"
                              disabled={saving}
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center transition-colors duration-200"
                              disabled={saving}
                            >
                              {saving ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                  Guardando...
                                </>
                              ) : (
                                <>
                                  <FaPlus className="mr-2" />
                                  Guardar
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'clientes' ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Clientes</h2>
                  <div className="flex space-x-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar clientes..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    </div>
                    <button
                      onClick={() => {
                        setShowModalCliente(true);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                    >
                      <FaPlus className="inline-block mr-2" />
                      Nuevo Cliente
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtrarClientes().map((cliente) => (
                    <div key={cliente.id} className="bg-gray-700 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-white">{cliente.nombre}</h3>
                        </div>
                        <div className="space-y-2 mb-6">
                          <div className="flex items-center text-gray-300">
                            <FaPhone className="mr-2" />
                            <span>{cliente.telefono}</span>
                          </div>
                          {cliente.numeroCliente && (
                            <div className="flex items-center text-gray-300">
                              <FaTag className="mr-2" />
                              <span>Cliente #{cliente.numeroCliente}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Observaciones */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-300">Observaciones:</h4>
                            <button
                              onClick={() => handleEditObservaciones(cliente.id, cliente.observaciones)}
                              className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                              title="Editar observaciones"
                            >
                              <FaEdit size={14} />
                            </button>
                          </div>
                          <div className="bg-gray-800 p-3 rounded-lg">
                            {cliente.observaciones ? (
                              <p className="text-gray-300 text-sm whitespace-pre-wrap">{cliente.observaciones}</p>
                            ) : (
                              <p className="text-gray-500 text-sm italic">Sin observaciones</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Historial de trabajos */}
                        <div className="mt-4">
                          <h4 className="font-medium text-gray-300 mb-2">Trabajos realizados:</h4>
                          <div className="space-y-2">
                            {cliente.trabajos?.map((trabajo, index) => (
                              <div key={index} className="bg-gray-800 p-3 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center text-sm">
                                    <FaShoppingBag className="mr-2 text-blue-400" />
                                    <span className="font-medium text-gray-200">{trabajo.servicio}</span>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleEditTrabajo(cliente.id, index, trabajo)}
                                      className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                                      title="Editar trabajo"
                                    >
                                      <FaEdit size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTrabajo(cliente.id, index)}
                                      className="text-red-400 hover:text-red-300 transition-colors duration-200"
                                      title="Eliminar trabajo"
                                    >
                                      <FaTrash size={14} />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center text-sm text-gray-400 mt-1">
                                  <FaCalendarAlt className="mr-2" />
                                  <span>{new Date(trabajo.fecha).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-400 mt-1">
                                  <FaEuroSign className="mr-2" />
                                  <span>{trabajo.precio}€</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Formulario para agregar nuevo trabajo */}
                          <div className="mt-4 border-t border-gray-600 pt-4">
                            <h4 className="font-medium text-gray-300 mb-2">Agregar nuevo trabajo:</h4>
                            <div className="space-y-2">
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <FaShoppingBag className="text-gray-500" />
                                </div>
                                <input
                                  type="text"
                                  placeholder="Servicio (ej: Corte, Tinte)"
                                  value={nuevoTrabajo.servicio}
                                  onChange={(e) => setNuevoTrabajo({...nuevoTrabajo, servicio: e.target.value})}
                                  className="pl-10 block w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <FaCalendarAlt className="text-gray-500" />
                                </div>
                                <input
                                  type="date"
                                  value={nuevoTrabajo.fecha}
                                  onChange={(e) => setNuevoTrabajo({...nuevoTrabajo, fecha: e.target.value})}
                                  className="pl-10 block w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <FaEuroSign className="text-gray-500" />
                                </div>
                                <input
                                  type="number"
                                  placeholder="Precio"
                                  value={nuevoTrabajo.precio}
                                  onChange={(e) => setNuevoTrabajo({...nuevoTrabajo, precio: e.target.value})}
                                  className="pl-10 block w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <button
                                onClick={() => handleAddTrabajo(cliente.id)}
                                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center justify-center transition-colors duration-200"
                              >
                                <FaPlus className="mr-2" />
                                Agregar Trabajo
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => handleDeleteCliente(cliente.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center transition-colors duration-200"
                          >
                            <FaTrash className="mr-2" />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {showModalCliente && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                    <div className="relative mx-auto p-5 border border-gray-700 w-96 shadow-lg rounded-xl bg-gray-800">
                      <div className="mt-3">
                        <h3 className="text-xl font-bold text-white mb-4">Nuevo Cliente</h3>
                        {error && (
                          <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-200 rounded-lg">
                            {error}
                          </div>
                        )}
                        <form onSubmit={handleAddCliente} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaUserPlus className="text-gray-500" />
                              </div>
                              <input
                                type="text"
                                value={nuevoCliente.nombre}
                                onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                                className="pl-10 block w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaPhone className="text-gray-500" />
                              </div>
                              <input
                                type="tel"
                                value={nuevoCliente.telefono}
                                onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}
                                className="pl-10 block w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Número de Cliente</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaTag className="text-gray-500" />
                              </div>
                              <input
                                type="number"
                                placeholder="Número único del cliente"
                                value={nuevoCliente.numeroCliente}
                                onChange={(e) => setNuevoCliente({...nuevoCliente, numeroCliente: e.target.value})}
                                className="pl-10 block w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Observaciones</label>
                            <textarea
                              placeholder="Observaciones sobre el cliente (opcional)"
                              value={nuevoCliente.observaciones}
                              onChange={(e) => setNuevoCliente({...nuevoCliente, observaciones: e.target.value})}
                              className="block w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 p-3"
                              rows="3"
                            />
                          </div>
                          <div className="flex justify-end space-x-3">
                            <button
                              type="button"
                              onClick={() => setShowModalCliente(false)}
                              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200"
                              disabled={saving}
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center transition-colors duration-200"
                              disabled={saving}
                            >
                              {saving ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                  Guardando...
                                </>
                              ) : (
                                <>
                                  <FaPlus className="mr-2" />
                                  Guardar
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Modal para editar trabajo */}
                {showModalEditTrabajo && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                    <div className="relative mx-auto p-5 border border-gray-700 w-96 shadow-lg rounded-xl bg-gray-800">
                      <div className="mt-3">
                        <h3 className="text-xl font-bold text-white mb-4">Editar Trabajo</h3>
                        {error && (
                          <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-200 rounded-lg">
                            {error}
                          </div>
                        )}
                        <form onSubmit={handleUpdateTrabajo} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Servicio</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaShoppingBag className="text-gray-500" />
                              </div>
                              <input
                                type="text"
                                placeholder="Servicio (ej: Corte, Tinte)"
                                value={trabajoEditando.servicio}
                                onChange={(e) => setTrabajoEditando({...trabajoEditando, servicio: e.target.value})}
                                className="pl-10 block w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Fecha</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaCalendarAlt className="text-gray-500" />
                              </div>
                              <input
                                type="date"
                                value={trabajoEditando.fecha}
                                onChange={(e) => setTrabajoEditando({...trabajoEditando, fecha: e.target.value})}
                                className="pl-10 block w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Precio</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaEuroSign className="text-gray-500" />
                              </div>
                              <input
                                type="number"
                                placeholder="Precio"
                                value={trabajoEditando.precio}
                                onChange={(e) => setTrabajoEditando({...trabajoEditando, precio: e.target.value})}
                                className="pl-10 block w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-3">
                            <button
                              type="button"
                              onClick={() => {
                                setShowModalEditTrabajo(false);
                                setEditandoTrabajo(null);
                                setTrabajoEditando({ servicio: '', fecha: '', precio: '' });
                              }}
                              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center transition-colors duration-200"
                            >
                              <FaEdit className="mr-2" />
                              Actualizar
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Modal para editar observaciones */}
                {showModalEditObservaciones && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                    <div className="relative mx-auto p-5 border border-gray-700 w-96 shadow-lg rounded-xl bg-gray-800">
                      <div className="mt-3">
                        <h3 className="text-xl font-bold text-white mb-4">Editar Observaciones</h3>
                        {error && (
                          <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-200 rounded-lg">
                            {error}
                          </div>
                        )}
                        <form onSubmit={handleUpdateObservaciones} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Observaciones</label>
                            <textarea
                              placeholder="Observaciones sobre el cliente"
                              value={observacionesEditando}
                              onChange={(e) => setObservacionesEditando(e.target.value)}
                              className="block w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 p-3"
                              rows="5"
                            />
                          </div>
                          <div className="flex justify-end space-x-3">
                            <button
                              type="button"
                              onClick={() => {
                                setShowModalEditObservaciones(false);
                                setEditandoObservaciones(null);
                                setObservacionesEditando('');
                              }}
                              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center transition-colors duration-200"
                            >
                              <FaEdit className="mr-2" />
                              Actualizar
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <CitasPage user={user} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 