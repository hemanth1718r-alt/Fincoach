// script.js - Functionality and Interaction

let chartsRendered = false;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Finance Coach frontend initialized.');

    // DOM Elements
    const loginForm = document.getElementById('login-form');
    const authSection = document.getElementById('auth-section');
    const mainNav = document.getElementById('main-nav');
    const logoutBtn = document.getElementById('logout-btn');
    const navButtons = document.querySelectorAll('.nav-btn[data-target]');
    const viewSections = document.querySelectorAll('.view-section');

    // Step 1: Login functionality
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            authSection.classList.add('hidden');
            mainNav.classList.remove('hidden');
            
            showSection('dashboard-section');
            
            // Initialize Dynamic Components
            if (!chartsRendered) {
                renderCharts();
                chartsRendered = true;
            }
            renderTransactions();
            renderBudgets();
            renderGoals();
        });
    }

    // Tab Navigation
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            navButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            showSection(e.target.getAttribute('data-target') + '-section');
        });
    });

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            mainNav.classList.add('hidden');
            viewSections.forEach(sec => sec.classList.add('hidden'));
            authSection.classList.remove('hidden');
            loginForm.reset();
        });
    }

    function showSection(sectionId) {
        viewSections.forEach(sec => sec.classList.add('hidden'));
        const target = document.getElementById(sectionId);
        if (target) target.classList.remove('hidden');
    }

    // Mock Data for the UI
    const mockTransactions = [
        { date: '2026-09-15', desc: 'Grocery Store', category: 'Food', type: 'Expense', amount: 3500 },
        { date: '2026-09-14', desc: 'Salary', category: 'Income', type: 'Income', amount: 80000 },
        { date: '2026-09-12', desc: 'Electricity Bill', category: 'Bills', type: 'Expense', amount: 1200 },
        { date: '2026-09-10', desc: 'Netflix Subscription', category: 'Entertainment', type: 'Expense', amount: 649 },
        { date: '2026-09-08', desc: 'Restaurant', category: 'Food', type: 'Expense', amount: 1800 }
    ];

    const mockBudgets = [
        { category: 'Food', spent: 5300, limit: 10000, color: '#4CAF50' },
        { category: 'Entertainment', spent: 3000, limit: 2500, color: '#F44336' }, // Over budget
        { category: 'Shopping', spent: 1500, limit: 5000, color: '#2196F3' }
    ];

    const mockGoals = [
        { name: 'Emergency Fund', saved: 35000, target: 60000, color: '#4CAF50' },
        { name: 'New Laptop', saved: 15000, target: 80000, color: '#9C27B0' },
        { name: 'Vacation', saved: 5000, target: 20000, color: '#FF9800' }
    ];

    // Step 3: Render Transactions
    function renderTransactions() {
        const tbody = document.getElementById('transaction-list');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        mockTransactions.forEach(t => {
            const tr = document.createElement('tr');
            const amountClass = t.type === 'Income' ? 'text-success' : '';
            const amountSign = t.type === 'Income' ? '+' : '-';
            
            tr.innerHTML = `
                <td>${t.date}</td>
                <td>${t.desc}</td>
                <td>${t.category}</td>
                <td>${t.type}</td>
                <td class="${amountClass}">${amountSign}₹${t.amount.toLocaleString()}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Step 4: Render Budgets
    function renderBudgets() {
        const list = document.getElementById('budget-list');
        if (!list) return;
        list.innerHTML = '';
        
        mockBudgets.forEach(b => {
            const percent = Math.min((b.spent / b.limit) * 100, 100);
            const isOver = b.spent > b.limit;
            const barColor = isOver ? '#c0392b' : b.color;
            
            list.innerHTML += `
                <div class="card item-card">
                    <h3>${b.category} Budget</h3>
                    <div class="progress-labels">
                        <span>Spent: ₹${b.spent.toLocaleString()}</span>
                        <span>Limit: ₹${b.limit.toLocaleString()}</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-fill" style="width: ${percent}%; background-color: ${barColor};"></div>
                    </div>
                    ${isOver ? '<p class="text-danger" style="margin-top:10px; font-size:0.8rem;">Over Budget!</p>' : ''}
                </div>
            `;
        });
    }

    // Step 5: Render Goals
    function renderGoals() {
        const list = document.getElementById('goal-list');
        if (!list) return;
        list.innerHTML = '';
        
        mockGoals.forEach(g => {
            const percent = Math.min((g.saved / g.target) * 100, 100);
            
            list.innerHTML += `
                <div class="card item-card">
                    <h3>${g.name}</h3>
                    <div class="progress-labels">
                        <span>Saved: ₹${g.saved.toLocaleString()}</span>
                        <span>Target: ₹${g.target.toLocaleString()}</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-fill" style="width: ${percent}%; background-color: ${g.color};"></div>
                    </div>
                    <p style="text-align:right; margin-top:5px; font-size:0.8rem; color:#666;">${percent.toFixed(0)}% Complete</p>
                </div>
            `;
        });
    }

    // Step 6: Initialize Chart.js
    function renderCharts() {
        const pieCtx = document.getElementById('expensePieChart').getContext('2d');
        new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Food', 'Rent', 'Shopping', 'Bills', 'Entertainment'],
                datasets: [{
                    data: [8000, 15000, 4000, 3000, 5000],
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        const barCtx = document.getElementById('incomeExpenseBarChart').getContext('2d');
        new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['January', 'February', 'March', 'April', 'May'],
                datasets: [
                    { label: 'Income', data: [75000, 78000, 75000, 82000, 80000], backgroundColor: '#4CAF50' },
                    { label: 'Expenses', data: [32000, 34000, 31000, 36000, 35000], backgroundColor: '#F44336' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
});
