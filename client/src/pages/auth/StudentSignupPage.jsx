import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, User, Mail, Calendar, Building, Layers, Hash, Lock, Phone, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import api from '../../services/api';

export const StudentSignupPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    registrationNumber: '',
    name: '',
    email: '',
    dateOfBirth: '',
    departmentId: '',
    year: '1',
    section: 'A',
    password: '',
    confirmPassword: '',
    parentName: '',
    parentMobile: '',
    parentEmail: '',
  });

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/auth/departments');
        if (res.data?.success && res.data.data.length > 0) {
          setDepartments(res.data.data);
          setFormData((prev) => ({ ...prev, departmentId: res.data.data[0].id }));
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    fetchDepts();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Frontend validations
    if (!formData.registrationNumber.trim()) {
      setErrorMessage('Registration number cannot be empty.');
      return;
    }

    if (!formData.departmentId) {
      setErrorMessage('Please select your department. If departments are loading, please wait a few seconds and try again.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMessage('Please enter a valid college email address.');
      return;
    }

    if (!emailRegex.test(formData.parentEmail)) {
      setErrorMessage('Please enter a valid parent/guardian email address.');
      return;
    }

    const phoneDigits = formData.parentMobile.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setErrorMessage('Parent/Guardian mobile number must be at least 10 digits.');
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Password and confirm password must match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register/student', formData);
      if (res.data?.success) {
        setSuccessMessage('Student account created successfully.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'An error occurred during registration. Please try again.';
      if (msg.toLowerCase().includes('already exists')) {
        setErrorMessage(`${msg} If this is your account, please click "Back to Login" to sign in.`);
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Link */}
        <Link
          to="/login"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-brand-800 hover:text-brand-950 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </Link>

        {/* Card Header */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-brand-900 text-white flex items-center justify-center font-bold shadow-sm">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Student Account Registration</h1>
              <p className="text-xs text-slate-500">
                Register for the Academic Monitoring & Early Intervention System
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start space-x-2.5 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-semibold">{successMessage}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Redirecting to Student Login...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Academic & Personal Details */}
            <div>
              <h2 className="text-xs font-bold text-brand-900 uppercase tracking-wider mb-3">
                1. Academic & Personal Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registration Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    placeholder="e.g. 23CSE101"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs uppercase font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    College Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. aarav@university.edu"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                  >
                    {departments.length === 0 ? (
                      <option value="">Loading departments from server...</option>
                    ) : (
                      <option value="">-- Select Department --</option>
                    )}
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Year of Study <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                  >
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Section <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Parent / Guardian Information */}
            <div className="pt-4 border-t border-slate-100">
              <h2 className="text-xs font-bold text-brand-900 uppercase tracking-wider mb-3">
                2. Parent / Guardian Contact Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Parent/Guardian Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="parentName"
                    value={formData.parentName}
                    onChange={handleChange}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    name="parentMobile"
                    value={formData.parentMobile}
                    onChange={handleChange}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    name="parentEmail"
                    value={formData.parentEmail}
                    onChange={handleChange}
                    placeholder="e.g. parent@gmail.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Password Credentials */}
            <div className="pt-4 border-t border-slate-100">
              <h2 className="text-xs font-bold text-brand-900 uppercase tracking-wider mb-3">
                3. Student Password Setup
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm matching password"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-brand-900 hover:bg-brand-950 text-white rounded-lg text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-900 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Creating Student Account...' : 'Complete Registration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentSignupPage;
