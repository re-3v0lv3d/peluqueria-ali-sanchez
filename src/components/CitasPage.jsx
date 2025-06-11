import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Estilos por defecto del calendario
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';

const CitasPage = ({ user }) => {
  const [citas, setCitas] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingCita, setEditingCita] = useState(null);
  const [formCita, setFormCita] = useState({
    cliente: '',
    servicio: '',
    fecha: '',
    hora: '',
    notas: '',
    precio: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const citasRef = collection(db, 'citas');
    const q = query(citasRef, orderBy('fecha'), orderBy('hora'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedCitas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCitas(loadedCitas);
      setLoading(false);
    }, (err) => {
      console.error("Error al cargar citas:", err);
      setError('Error al cargar las citas.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleOpenModal = (cita = null) => {
    setEditingCita(cita);

    // Calcular la cadena de fecha local para selectedDate en formato YYYY-MM-DD
    const year = selectedDate.getFullYear();
    const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0'); // Mes es 0-indexado
    const day = selectedDate.getDate().toString().padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;

    setFormCita(cita ? 
      { 
        cliente: cita.cliente, 
        servicio: cita.servicio, 
        fecha: cita.fecha.toDate().toISOString().split('T')[0], 
        hora: cita.hora, 
        notas: cita.notas, 
        precio: cita.precio 
      } : 
      { 
        cliente: '', 
        servicio: '', 
        fecha: localDateString, 
        hora: '', 
        notas: '',
        precio: '' 
      }
    );
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCita(null);
    setFormCita({
      cliente: '',
      servicio: '',
      fecha: '',
      hora: '',
      notas: '',
      precio: ''
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormCita(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveCita = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const fechaCita = new Date(formCita.fecha);
      if (isNaN(fechaCita.getTime())) {
        setError('Fecha inválida.');
        return;
      }

      // Validar que el precio sea un número válido
      const precioCita = parseFloat(formCita.precio);
      if (isNaN(precioCita) || precioCita < 0) {
        setError('Por favor, introduce un precio válido (número positivo).');
        return;
      }

      const citaData = {
        ...formCita,
        fecha: fechaCita,
        precio: precioCita,
        userId: user.uid
      };

      const citasRef = collection(db, 'citas');
      
      if (editingCita) {
        await updateDoc(doc(db, 'citas', editingCita.id), citaData);
      } else {
        await addDoc(citasRef, citaData);
      }
      handleCloseModal();
    } catch (err) {
      console.error("Error al guardar cita:", err);
      setError(`Error al guardar la cita: ${err.message}`);
    }
  };

  const handleDeleteCita = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta cita?')) {
      try {
        await deleteDoc(doc(db, 'citas', id));
      } catch (err) {
        console.error("Error al eliminar cita:", err);
        setError('Error al eliminar la cita.');
      }
    }
  };

  const getCitasForSelectedDate = () => {
    return citas.filter(cita => {
      const citaDate = cita.fecha?.toDate();
      return citaDate && 
             citaDate.getDate() === selectedDate.getDate() &&
             citaDate.getMonth() === selectedDate.getMonth() &&
             citaDate.getFullYear() === selectedDate.getFullYear();
    });
  };

  if (loading) {
    return <div className="text-center text-white">Cargando citas...</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Gestión de Citas</h2>
      
      {error && <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-200 rounded-lg">{error}</div>}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sección de Calendario */}
        <div className="lg:w-1/2 bg-gray-700 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-bold text-white mb-4">Selecciona una fecha</h3>
          <Calendar 
            onChange={handleDateChange} 
            value={selectedDate} 
            className="react-calendar-dark" // Clase para aplicar tema oscuro
          />
          <button 
            onClick={() => handleOpenModal()} 
            className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
          >
            <FaPlus className="mr-2" /> Nueva Cita para {selectedDate.toLocaleDateString()}
          </button>
        </div>

        {/* Sección de Citas del día */}
        <div className="lg:w-1/2 bg-gray-700 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-bold text-white mb-4">Citas para {selectedDate.toLocaleDateString()}</h3>
          {getCitasForSelectedDate().length === 0 ? (
            <p className="text-gray-400">No hay citas programadas para esta fecha.</p>
          ) : (
            <div className="space-y-4">
              {getCitasForSelectedDate().map(cita => (
                <div key={cita.id} className="bg-gray-800 p-4 rounded-lg shadow-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-lg font-semibold text-white">{cita.cliente}</h4>
                    <span className="text-gray-400 text-sm">{cita.hora}</span>
                  </div>
                  <p className="text-gray-300">Servicio: {cita.servicio}</p>
                  {cita.notas && <p className="text-gray-400 text-sm">Notas: {cita.notas}</p>}
                  <p className="text-gray-300 font-semibold mt-1">Presupuesto: {cita.precio} €</p>
                  <div className="mt-3 flex space-x-2 justify-end">
                    <button 
                      onClick={() => handleOpenModal(cita)} 
                      className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      onClick={() => handleDeleteCita(cita.id)} 
                      className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal para Añadir/Editar Cita */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl shadow-xl w-full max-w-md">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">{editingCita ? 'Editar Cita' : 'Nueva Cita'}</h3>
            {error && <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-200 rounded-lg">{error}</div>}
            <form onSubmit={handleSaveCita} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Cliente</label>
                <input
                  type="text"
                  name="cliente"
                  value={formCita.cliente}
                  onChange={handleFormChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Servicio</label>
                <input
                  type="text"
                  name="servicio"
                  value={formCita.servicio}
                  onChange={handleFormChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Fecha</label>
                <input
                  type="date"
                  name="fecha"
                  value={formCita.fecha}
                  onChange={handleFormChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Hora</label>
                <input
                  type="time"
                  name="hora"
                  value={formCita.hora}
                  onChange={handleFormChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Precio / Presupuesto (€)</label>
                <input
                  type="number"
                  name="precio"
                  value={formCita.precio}
                  onChange={handleFormChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Notas (opcional)</label>
                <textarea
                  name="notas"
                  value={formCita.notas}
                  onChange={handleFormChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                  rows="3"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-4">
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  className="bg-gray-600 text-white font-bold py-2 px-4 rounded hover:bg-gray-700 transition"
                >
                  <FaTimes className="mr-2" /> Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition"
                >
                  <FaPlus className="mr-2" /> {editingCita ? 'Guardar Cambios' : 'Crear Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitasPage; 