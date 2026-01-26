import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Transaction } from '../types';
import NewTransactionModal from './NewTransactionModal';
import { useToast } from '../contexts/ToastContext';

export default function Payables() {
    const { transactions, deleteTransaction, updateTransaction } = useApp();
    const { showToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'pago'>('pendente');

    const payables = useMemo(() => {
        return transactions
            .filter(t => t.type === 'expense')
            .filter(t => filterStatus === 'todos' || (t.status || 'pago') === filterStatus)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [transactions, filterStatus]);

    const stats = useMemo(() => {
        const pendente = transactions
            .filter(t => t.type === 'expense' && (t.status === 'pendente'))
            .reduce((acc, t) => acc + t.amount, 0);

        const pago = transactions
            .filter(t => t.type === 'expense' && (t.status === 'pago' || !t.status))
            .reduce((acc, t) => acc + t.amount, 0);

        return { pendente, pago };
    }, [transactions]);

    const handleMarkAsPaid = async (transaction: Transaction) => {
        try {
            await updateTransaction(transaction.id, {
                status: 'pago',
                date: new Date().toISOString() // Set current date as payment date
            });
            showToast('success', 'Conta marcada como paga!');
        } catch (error) {
            showToast('error', 'Erro ao atualizar status.');
        }
    };

    return (
        <div className="pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-navy tracking-tight">CONTAS A PAGAR</h1>
                    <p className="text-gray-400 font-medium">Gestão de compromissos e despesas futuras</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="h-12 px-6 rounded-2xl bg-navy text-white font-bold hover:bg-navy/90 transition-all shadow-xl shadow-navy/20 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">add</span>
                    Registrar Conta
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="size-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">pending_actions</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Pendente</p>
                        <h2 className="text-2xl font-black text-navy">R$ {stats.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="size-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">task_alt</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Pago (Mês)</p>
                        <h2 className="text-2xl font-black text-navy">R$ {stats.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <div className="flex gap-2">
                        {(['todos', 'pendente', 'pago'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === s ? 'bg-navy text-white shadow-lg shadow-navy/20' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                            >
                                {s === 'todos' ? 'Todos' : s === 'pendente' ? 'Pendentes' : 'Pagos'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-50">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data / Vencimento</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {payables.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium italic">Nenhuma conta encontrada.</td>
                                </tr>
                            ) : payables.map(t => (
                                <tr key={t.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-navy">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                                            {t.dueDate && <span className="text-[10px] text-orange-500 font-bold uppercase">Vence: {new Date(t.dueDate).toLocaleDateString('pt-BR')}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{t.description}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-wider">
                                            {t.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-black text-navy text-right">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${t.status === 'pendente' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                            {t.status === 'pendente' ? 'Pendente' : 'Pago'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {t.status === 'pendente' && (
                                                <button
                                                    onClick={() => handleMarkAsPaid(t)}
                                                    className="size-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition-colors shadow-sm"
                                                    title="Marcar como Pago"
                                                >
                                                    <span className="material-symbols-outlined text-lg">check</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => { if (confirm('Excluir este lançamento?')) deleteTransaction(t.id); }}
                                                className="size-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors shadow-sm"
                                                title="Excluir"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <NewTransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                forcedType="expense"
            />
        </div>
    );
}
