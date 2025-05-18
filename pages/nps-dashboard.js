import { useEffect, useState } from 'react';
import Head from 'next/head';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function NPSDashboard() {
    const [metrics, setMetrics] = useState({
        total: 0,
        enviados: 0,
        respondidos: 0,
        detratores: 0,
        promotores: 0,
        neutros: 0
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/nps-dashboard');
                if (!response.ok) {
                    throw new Error('Erro ao buscar dados');
                }
                const data = await response.json();
                setMetrics(data);
                setError(null);
            } catch (err) {
                setError(err.message);
                console.error('Erro ao buscar dados:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5 * 60 * 1000); // Atualizar a cada 5 minutos

        return () => clearInterval(interval);
    }, []);

    const chartData = {
        labels: ['Detratores', 'Neutros', 'Promotores'],
        datasets: [{
            label: 'Distribuição NPS',
            data: [metrics.detratores, metrics.neutros, metrics.promotores],
            backgroundColor: [
                'rgba(239, 68, 68, 0.8)',  // Vermelho para detratores
                'rgba(234, 179, 8, 0.8)',  // Amarelo para neutros
                'rgba(34, 197, 94, 0.8)'   // Verde para promotores
            ],
            borderColor: [
                'rgb(239, 68, 68)',
                'rgb(234, 179, 8)',
                'rgb(34, 197, 94)'
            ],
            borderWidth: 1
        }]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: 'Distribuição de NPS',
                font: {
                    size: 16
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-xl text-gray-600">Carregando...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-xl text-red-600">Erro: {error}</div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>Dashboard NPS - Bravy</title>
                <meta name="description" content="Dashboard de métricas NPS" />
            </Head>

            <div className="min-h-screen bg-gray-100">
                <div className="container mx-auto px-4 py-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard NPS</h1>
                    
                    {/* Grid de métricas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {/* Total */}
                        <div className="bg-white rounded-lg shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
                            <div className="text-4xl font-bold text-gray-800">{metrics.total}</div>
                            <div className="text-sm text-gray-600 mt-2">NPS Totais</div>
                        </div>
                        
                        {/* Enviados */}
                        <div className="bg-white rounded-lg shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
                            <div className="text-4xl font-bold text-gray-800">{metrics.enviados}</div>
                            <div className="text-sm text-gray-600 mt-2">NPS Enviados</div>
                        </div>
                        
                        {/* Respondidos */}
                        <div className="bg-white rounded-lg shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
                            <div className="text-4xl font-bold text-gray-800">{metrics.respondidos}</div>
                            <div className="text-sm text-gray-600 mt-2">NPS Respondidos</div>
                        </div>
                        
                        {/* Detratores */}
                        <div className="bg-white rounded-lg shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
                            <div className="text-4xl font-bold text-red-600">{metrics.detratores}</div>
                            <div className="text-sm text-gray-600 mt-2">Detratores</div>
                        </div>
                        
                        {/* Neutros */}
                        <div className="bg-white rounded-lg shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
                            <div className="text-4xl font-bold text-yellow-600">{metrics.neutros}</div>
                            <div className="text-sm text-gray-600 mt-2">Neutros</div>
                        </div>
                        
                        {/* Promotores */}
                        <div className="bg-white rounded-lg shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
                            <div className="text-4xl font-bold text-green-600">{metrics.promotores}</div>
                            <div className="text-sm text-gray-600 mt-2">Promotores</div>
                        </div>
                    </div>

                    {/* Gráfico */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <Bar data={chartData} options={chartOptions} />
                    </div>
                </div>
            </div>
        </>
    );
} 